import { Deletable, SaveableAPIObject } from "./base";
import { Criterion } from './criterion';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class CriterionResultData {
    pk: number;
    last_modified: string;
    selected: boolean;
    criterion: Criterion;
    handgrading_result: number;

    constructor({
        pk,
        last_modified,
        selected,
        criterion,
        handgrading_result,
    }: CriterionResultData) {
        this.pk = pk;
        this.last_modified = last_modified;
        this.selected = selected;
        this.criterion = criterion;
        this.handgrading_result = handgrading_result;
    }
}

export interface CriterionResultObserver {
    update_criterion_result_created(criterion_result: CriterionResult): void;
    update_criterion_result_changed(criterion_result: CriterionResult): void;
    update_criterion_result_deleted(criterion_result: CriterionResult): void;
}

export class CriterionResult extends CriterionResultData implements SaveableAPIObject,
                                                                    Deletable {
    private static _subscribers = new Set<CriterionResultObserver>();

    static subscribe(observer: CriterionResultObserver) {
        CriterionResult._subscribers.add(observer);
    }

    static unsubscribe(observer: CriterionResultObserver) {
        CriterionResult._subscribers.delete(observer);
    }

    static async get_all_from_handgrading_result(
        handgrading_result_pk: number): Promise<CriterionResult[]> {
        let response = await HttpClient.get_instance().get<CriterionResultData[]>(
            `/handgrading_results/${handgrading_result_pk}/criterion_results/`
        );
        return response.data.map((data) => new CriterionResult(data));
    }

    static async get_by_pk(criterion_result_pk: number): Promise<CriterionResult> {
        let response = await HttpClient.get_instance().get<CriterionResultData>(
            `/criterion_results/${criterion_result_pk}/`
        );
        return new CriterionResult(response.data);
    }

    static async create(handgrading_result_pk: number,
                        data: NewCriterionResultData): Promise<CriterionResult> {
        let response = await HttpClient.get_instance().post<CriterionResultData>(
            `/handgrading_results/${handgrading_result_pk}/criterion_results/`,
            data
        );
        let result = new CriterionResult(response.data);
        CriterionResult.notify_criterion_result_created(result);
        return result;
    }

    static notify_criterion_result_created(criterion_result: CriterionResult) {
        for (let subscriber of CriterionResult._subscribers) {
            subscriber.update_criterion_result_created(criterion_result);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CriterionResultData>(
            `/criterion_results/${this.pk}/`,
            filter_keys(this, CriterionResult.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        CriterionResult.notify_criterion_result_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<CriterionResultData>(
            `/criterion_results/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            CriterionResult.notify_criterion_result_changed(this);
        }
    }

    static notify_criterion_result_changed(criterion_result: CriterionResult) {
        for (let subscriber of CriterionResult._subscribers) {
            subscriber.update_criterion_result_changed(criterion_result);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/criterion_results/${this.pk}/`
        );
        CriterionResult.notify_criterion_result_deleted(this);
    }

    static notify_criterion_result_deleted(criterion_result: CriterionResult) {
        for (let subscriber of CriterionResult._subscribers) {
            subscriber.update_criterion_result_deleted(criterion_result);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof CriterionResultData)[] = [
        'selected',
    ];
}

export class NewCriterionResultData {
    selected: boolean;
    criterion: number;

    constructor({
        selected,
        criterion,
    }: NewCriterionResultData) {
        this.selected = selected;
        this.criterion = criterion;
    }
}
