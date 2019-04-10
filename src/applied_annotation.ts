import { Annotation } from './annotation';
import { Deletable } from "./base";
import { HttpClient } from './http_client';

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
    update_applied_annotation_deleted(applied_annotation: AppliedAnnotation): void;
}

export class AppliedAnnotation extends AppliedAnnotationData implements Deletable {
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

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/applied_annotations/${this.pk}/`
        );
        AppliedAnnotation.notify_applied_annotation_deleted(this);
    }

    static notify_applied_annotation_deleted(applied_annotation: AppliedAnnotation) {
        for (let subscriber of AppliedAnnotation._subscribers) {
            subscriber.update_applied_annotation_deleted(applied_annotation);
        }
    }
}

export class NewAppliedAnnotationData {
    annotation: number;
    location: NewLocationData;

    constructor({
        annotation,
        location
    }: NewAppliedAnnotationData) {
        this.annotation = annotation;
        this.location = location;
    }
}

export class Location {
    pk: number;
    first_line: number;
    last_line: number;
    filename: string;
    last_modified: string;

    constructor({
        pk,
        first_line,
        last_line,
        filename,
        last_modified
    }: Location) {
        this.pk = pk;
        this.first_line = first_line;
        this.last_line = last_line;
        this.filename = filename;
        this.last_modified = last_modified;
    }
}

export class NewLocationData {
    first_line: number;
    last_line: number;
    filename: string;

    constructor({
        first_line,
        last_line,
        filename
    }: NewLocationData) {
        this.first_line = first_line;
        this.last_line = last_line;
        this.filename = filename;
    }
}
