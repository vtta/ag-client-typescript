import { Annotation } from './annotation';
import { Deletable, SaveableAPIObject } from "./base";
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class AppliedAnnotationData {
    pk: number;
    last_modified: string;
    location: Location;
    annotation: Annotation;
    handgrading_result: number;

    constructor({
        pk,
        last_modified,
        location,
        annotation,
        handgrading_result,
    }: AppliedAnnotationData) {
        this.pk = pk;
        this.last_modified = last_modified;
        this.location = location;
        this.annotation = annotation;
        this.handgrading_result = handgrading_result;
    }
}

export interface AppliedAnnotationObserver {
    update_applied_annotation_created(applied_annotation: AppliedAnnotation): void;
    update_applied_annotation_changed(applied_annotation: AppliedAnnotation): void;
    update_applied_annotation_deleted(applied_annotation: AppliedAnnotation): void;
}

export class AppliedAnnotation extends AppliedAnnotationData implements SaveableAPIObject,
                                                                        Deletable {
    private static _subscribers = new Set<AppliedAnnotationObserver>();

    static subscribe(observer: AppliedAnnotationObserver) {
        AppliedAnnotation._subscribers.add(observer);
    }

    static unsubscribe(observer: AppliedAnnotationObserver) {
        AppliedAnnotation._subscribers.delete(observer);
    }

    static async get_all_from_handgrading_result(
        handgrading_result_pk: number): Promise<AppliedAnnotation[]> {
        let response = await HttpClient.get_instance().get<AppliedAnnotationData[]>(
            `/handgrading_results/${handgrading_result_pk}/applied_annotations/`
        );
        return response.data.map((data) => new AppliedAnnotation(data));
    }

    static async get_by_pk(applied_annotation_pk: number): Promise<AppliedAnnotation> {
        let response = await HttpClient.get_instance().get<AppliedAnnotationData>(
            `/applied_annotations/${applied_annotation_pk}/`
        );
        return new AppliedAnnotation(response.data);
    }

    static async create(handgrading_result_pk: number,
                        data: NewAppliedAnnotationData): Promise<AppliedAnnotation> {
        let response = await HttpClient.get_instance().post<AppliedAnnotationData>(
            `/handgrading_results/${handgrading_result_pk}/applied_annotations/`,
            data
        );
        let result = new AppliedAnnotation(response.data);
        AppliedAnnotation.notify_applied_annotation_created(result);
        return result;
    }

    static notify_applied_annotation_created(applied_annotation: AppliedAnnotation) {
        for (let subscriber of AppliedAnnotation._subscribers) {
            subscriber.update_applied_annotation_created(applied_annotation);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<AppliedAnnotationData>(
            `/applied_annotations/${this.pk}/`,
            filter_keys(this, AppliedAnnotation.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        AppliedAnnotation.notify_applied_annotation_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<AppliedAnnotationData>(
            `/applied_annotations/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            AppliedAnnotation.notify_applied_annotation_changed(this);
        }
    }

    static notify_applied_annotation_changed(applied_annotation: AppliedAnnotation) {
        for (let subscriber of AppliedAnnotation._subscribers) {
            subscriber.update_applied_annotation_changed(applied_annotation);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/applied_annotation/${this.pk}/`
        );
        AppliedAnnotation.notify_applied_annotation_deleted(this);
    }

    static notify_applied_annotation_deleted(applied_annotation: AppliedAnnotation) {
        for (let subscriber of AppliedAnnotation._subscribers) {
            subscriber.update_applied_annotation_deleted(applied_annotation);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof AppliedAnnotationData)[] = [
        'location',
    ];
}

export class NewAppliedAnnotationData {
    location: boolean;

    constructor({
        location,
    }: NewAppliedAnnotationData) {
        this.location = location;
    }
}

export interface Location {
    pk: number;
    first_line: number;
    last_line: number;
    filename: string;
}
