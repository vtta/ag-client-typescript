import { Deletable, SaveableAPIObject } from "./base";
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class CriterionData {
    pk: number;
    handgrading_rubric: number;
    last_modified: string;
    short_description: string;
    long_description: string;
    points: number;

    constructor(args: CriterionData) {
        this.pk = args.pk;
        this.handgrading_rubric = args.handgrading_rubric;
        this.last_modified = args.last_modified;
        this.short_description = args.short_description;
        this.long_description = args.long_description;
        this.points = args.points;
    }
}

export interface CriterionObserver {
    update_criterion_created(criterion: Criterion): void;
    update_criterion_changed(criterion: Criterion): void;
    update_criterion_deleted(criterion: Criterion): void;
    update_criteria_order_changed(criterion_list: number[], handgrading_rubric_pk: number): void;
}

export class Criterion extends CriterionData implements SaveableAPIObject, Deletable {
    private static _subscribers = new Set<CriterionObserver>();

    static subscribe(observer: CriterionObserver) {
        Criterion._subscribers.add(observer);
    }

    static unsubscribe(observer: CriterionObserver) {
        Criterion._subscribers.delete(observer);
    }

    static async get_all_from_handgrading_rubric(
        handgrading_rubric_pk: number): Promise<Criterion[]> {
        let response = await HttpClient.get_instance().get<CriterionData[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/criteria/`
        );
        return response.data.map((data) => new Criterion(data));
    }

    static async get_by_pk(criterion_pk: number): Promise<Criterion> {
        let response = await HttpClient.get_instance().get<CriterionData>(
            `/criteria/${criterion_pk}/`
        );
        return new Criterion(response.data);
    }

    static async create(handgrading_rubric_pk: number,
                        data: NewCriterionData): Promise<Criterion> {
        let response = await HttpClient.get_instance().post<CriterionData>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/criteria/`,
            data
        );
        let result = new Criterion(response.data);
        Criterion.notify_criterion_created(result);
        return result;
    }

    static notify_criterion_created(criterion: Criterion) {
        for (let subscriber of Criterion._subscribers) {
            subscriber.update_criterion_created(criterion);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CriterionData>(
            `/criteria/${this.pk}/`,
            filter_keys(this, Criterion.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        Criterion.notify_criterion_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<CriterionData>(
            `/criteria/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            Criterion.notify_criterion_changed(this);
        }
    }

    static notify_criterion_changed(criterion: Criterion) {
        for (let subscriber of Criterion._subscribers) {
            subscriber.update_criterion_changed(criterion);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/criteria/${this.pk}/`
        );
        Criterion.notify_criterion_deleted(this);
    }

    static notify_criterion_deleted(criterion: Criterion) {
        for (let subscriber of Criterion._subscribers) {
            subscriber.update_criterion_deleted(criterion);
        }
    }

    static async get_order(handgrading_rubric_pk: number): Promise<number[]> {
        let response = await HttpClient.get_instance().get<number[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/criteria/order/`
        );
        return response.data;
    }

    static async update_order(handgrading_rubric_pk: number, data: string[]): Promise<number[]> {
        let response = await HttpClient.get_instance().put<number[]>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/criteria/order/`,
            data
        );
        let result = response.data;
        Criterion.notify_criteria_order_updated(result, handgrading_rubric_pk);
        return result;
    }

    static notify_criteria_order_updated(criterion_list: number[], handgrading_rubric_pk: number) {
        for (let subscriber of Criterion._subscribers) {
            subscriber.update_criteria_order_changed(criterion_list, handgrading_rubric_pk);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof CriterionData)[] = [
        'short_description',
        'long_description',
        'points',
    ];
}

export class NewCriterionData {
    short_description?: string;
    long_description?: string;
    points?: number;

    constructor(args: NewCriterionData) {
        this.short_description = args.short_description;
        this.long_description = args.long_description;
        this.points = args.points;
    }
}
