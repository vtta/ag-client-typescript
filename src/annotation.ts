import { Deletable, SaveableAPIObject } from "./base";
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class AnnotationData {
    pk: number;
    handgrading_rubric: number;
    short_description: string;
    long_description: string;
    deduction: number;
    max_deduction: number | null;
    last_modified: string;

    constructor(args: AnnotationData) {
        this.pk = args.pk;
        this.handgrading_rubric = args.handgrading_rubric;
        this.short_description = args.short_description;
        this.long_description = args.long_description;
        this.deduction = args.deduction;
        this.max_deduction = args.max_deduction;
        this.last_modified = args.last_modified;
    }
}

export interface AnnotationObserver {
    update_annotation_created(annotation: Annotation): void;
    update_annotation_changed(annotation: Annotation): void;
    update_annotation_deleted(annotation: Annotation): void;
    update_annotations_order_changed(annotation_list: number[],
                                     handgrading_rubric_pk: number): void;
}

export class Annotation extends AnnotationData implements SaveableAPIObject, Deletable {
    private static _subscribers = new Set<AnnotationObserver>();

    static subscribe(observer: AnnotationObserver) {
        Annotation._subscribers.add(observer);
    }

    static unsubscribe(observer: AnnotationObserver) {
        Annotation._subscribers.delete(observer);
    }

    static async get_all_from_handgrading_rubric(
        handgrading_rubric_pk: number): Promise<Annotation[]> {
        let response = await HttpClient.get_instance().get<AnnotationData[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/annotations/`
        );
        return response.data.map((data) => new Annotation(data));
    }

    static async get_by_pk(annotation_pk: number): Promise<Annotation> {
        let response = await HttpClient.get_instance().get<AnnotationData>(
            `/annotations/${annotation_pk}/`
        );
        return new Annotation(response.data);
    }

    static async create(handgrading_rubric_pk: number,
                        data: NewAnnotationData): Promise<Annotation> {
        let response = await HttpClient.get_instance().post<AnnotationData>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/annotations/`,
            data
        );
        let result = new Annotation(response.data);
        Annotation.notify_annotation_created(result);
        return result;
    }

    static notify_annotation_created(annotation: Annotation) {
        for (let subscriber of Annotation._subscribers) {
            subscriber.update_annotation_created(annotation);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<AnnotationData>(
            `/annotations/${this.pk}/`,
            filter_keys(this, Annotation.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        Annotation.notify_annotation_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<AnnotationData>(
            `/annotations/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            Annotation.notify_annotation_changed(this);
        }
    }

    static notify_annotation_changed(annotation: Annotation) {
        for (let subscriber of Annotation._subscribers) {
            subscriber.update_annotation_changed(annotation);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/annotations/${this.pk}/`
        );
        Annotation.notify_annotation_deleted(this);
    }

    static notify_annotation_deleted(annotation: Annotation) {
        for (let subscriber of Annotation._subscribers) {
            subscriber.update_annotation_deleted(annotation);
        }
    }

    static async get_order(handgrading_rubric_pk: number): Promise<number[]> {
        let response = await HttpClient.get_instance().get<number[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/annotations/order/`
        );
        return response.data;
    }

    static async update_order(handgrading_rubric_pk: number, data: number[]): Promise<number[]> {
        let response = await HttpClient.get_instance().put<number[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/annotations/order/`,
            data
        );
        let result = response.data;
        Annotation.notify_annotations_order_updated(result, handgrading_rubric_pk);
        return result;
    }

    static notify_annotations_order_updated(annotation_list: number[],
                                            handgrading_rubric_pk: number) {
        for (let subscriber of Annotation._subscribers) {
            subscriber.update_annotations_order_changed(annotation_list, handgrading_rubric_pk);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof AnnotationData)[] = [
        'short_description',
        'long_description',
        'deduction',
        'max_deduction',
    ];
}

export class NewAnnotationData {
    short_description?: string;
    long_description?: string;
    deduction?: number;
    max_deduction?: number;

    constructor(args: NewAnnotationData) {
        this.short_description = args.short_description;
        this.long_description = args.long_description;
        this.deduction = args.deduction;
        this.max_deduction = args.max_deduction;
    }
}
