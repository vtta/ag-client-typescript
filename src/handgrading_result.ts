import { AppliedAnnotation } from './applied_annotation';
import { SaveableAPIObject } from "./base";
import { CriterionResult } from './criterion_result';
import { HandgradingRubric } from './handgrading_rubric';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class HandgradingResultData {
    pk: number;
    last_modified: string;
    submission: number;
    handgrading_rubric: HandgradingRubric;
    group: number;
    applied_annotations: AppliedAnnotation[];
    comments: Comment[];
    criterion_results: CriterionResult[];
    finished_grading: boolean;
    points_adjustment: number;
    submitted_filenames: string[];
    total_points: number;
    total_points_possible: number;

    constructor({
        pk,
        last_modified,
        submission,
        handgrading_rubric,
        group,
        applied_annotations,
        comments,
        criterion_results,
        finished_grading,
        points_adjustment,
        submitted_filenames,
        total_points,
        total_points_possible,
    }: HandgradingResultData) {
        this.pk = pk;
        this.last_modified = last_modified;
        this.submission = submission;
        this.handgrading_rubric = handgrading_rubric;
        this.group = group;
        this.applied_annotations = applied_annotations;
        this.comments = comments;
        this.criterion_results = criterion_results;
        this.finished_grading = finished_grading;
        this.points_adjustment = points_adjustment;
        this.submitted_filenames = submitted_filenames;
        this.total_points = total_points;
        this.total_points_possible = total_points_possible;
    }
}

export interface HandgradingResultObserver {
    update_handgrading_result_created(handgrading_result: HandgradingResult): void;
    update_handgrading_result_changed(handgrading_result: HandgradingResult): void;
    update_handgrading_result_deleted(handgrading_result: HandgradingResult): void;
}

export class HandgradingResult extends HandgradingResultData implements SaveableAPIObject {
    private static _subscribers = new Set<HandgradingResultObserver>();

    static subscribe(observer: HandgradingResultObserver) {
        HandgradingResult._subscribers.add(observer);
    }

    static unsubscribe(observer: HandgradingResultObserver) {
        HandgradingResult._subscribers.delete(observer);
    }

    static async get_all_from_project(project_pk: number): Promise<HandgradingResult[]> {
        let response = await HttpClient.get_instance().get<HandgradingResultData[]>(
            `/projects/${project_pk}/handgrading_results/`
        );
        return response.data.map((data) => new HandgradingResult(data));
    }

    static async get_by_group_pk(group_pk: number): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`
        );
        return new HandgradingResult(response.data);
    }

    static async create(group_pk: number,
                        data: NewHandgradingResultData): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().post<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`,
            data
        );
        let result = new HandgradingResult(response.data);
        HandgradingResult.notify_handgrading_result_created(result);
        return result;
    }

    static notify_handgrading_result_created(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_created(handgrading_result);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`,
            filter_keys(this, HandgradingResult.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        HandgradingResult.notify_handgrading_result_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            HandgradingResult.notify_handgrading_result_changed(this);
        }
    }

    static notify_handgrading_result_changed(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_changed(handgrading_result);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof HandgradingResultData)[] = [
        'finished_grading',
        'points_adjustment',
    ];
}

export class NewHandgradingResultData {
    finished_grading?: string;
    points_adjustment?: number;

    constructor({
        finished_grading,
        points_adjustment,
    }: NewHandgradingResultData) {
        this.finished_grading = finished_grading;
        this.points_adjustment = points_adjustment;
    }
}
