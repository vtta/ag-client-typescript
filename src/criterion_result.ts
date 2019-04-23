import { Deletable, SaveableAPIObject } from "./base";
import { Criterion } from './criterion';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class CriterionResultCoreData {
    pk: number;
    last_modified: string;
    selected: boolean;
    handgrading_result: number;

    constructor(args: CriterionResultCoreData) {
        this.pk = args.pk;
        this.last_modified = args.last_modified;
        this.selected = args.selected;
        this.handgrading_result = args.handgrading_result;
    }
}

interface CriterionResultCtorArgs extends CriterionResultCoreData {
    criterion: Criterion;
}

export interface CriterionResultData extends CriterionResultCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _criterion_result_data_brand: unknown;
}

export interface CriterionResultObserver {
    update_criterion_result_changed(criterion_result: CriterionResult): void;
    update_criterion_result_deleted(criterion_result: CriterionResult): void;
}

export class CriterionResult extends CriterionResultCoreData implements SaveableAPIObject,
                                                                        Deletable {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _criterion_result_brand: unknown;

    criterion: Criterion;

    constructor(args: CriterionResultCtorArgs) {
        super(args);
        this.criterion = args.criterion;
    }

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

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CriterionResultData>(
            `/criterion_results/${this.pk}/`,
            filter_keys(this, CriterionResult.EDITABLE_FIELDS)
        );

        safe_assign(this, new CriterionResult(response.data));
        CriterionResult.notify_criterion_result_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<CriterionResultData>(
            `/criterion_results/${this.pk}/`
        );

        safe_assign(this, new CriterionResult(response.data));
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

    static readonly EDITABLE_FIELDS: (keyof CriterionResultCoreData)[] = [
        'selected',
    ];
}

export class NewCriterionResultData {
    criterion?: number;
    selected?: boolean;

    constructor(args: NewCriterionResultData) {
        this.criterion = args.criterion;
        this.selected = args.selected;
    }
}
