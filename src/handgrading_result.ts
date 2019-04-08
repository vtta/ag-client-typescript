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

    static async get_all_summary_from_project(project_pk: number,
                                              page_url: string = '',
                                              page_size: number = 1000,
                                              page_num: number = 1,
                                              include_staff: boolean = true
    ): Promise<SubmissionGroupHandgradingInfo> {
        const queries = `?page_size=${page_size}&page=${page_num}&include_staff=${include_staff}`;
        const url = page_url || (
            `/projects/${project_pk}/handgrading_results/${queries}`
        );
        let response = await HttpClient.get_instance().get<SubmissionGroupHandgradingInfo>(url);
        return new SubmissionGroupHandgradingInfo(response.data);
    }

    static async get_by_group_pk(group_pk: number): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`
        );
        return new HandgradingResult(response.data);
    }

    static async get_or_create(group_pk: number): Promise<HandgradingResult> {
        let response = await HttpClient.get_instance().post<HandgradingResultData>(
            `/groups/${group_pk}/handgrading_result/`,
            {}
        );

        let result = new HandgradingResult(response.data);

        // Only notify the observer if a handgrading result is actually created
        if (response.status === 201) {
            HandgradingResult.notify_handgrading_result_created(result);
        }

        return result;
    }

    static notify_handgrading_result_created(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_created(handgrading_result);
        }
    }

    static async get_file_from_handgrading_result(group_pk: number, file: string): Promise<string> {
        let response = await HttpClient.get_instance().get<string>(
            `/groups/${group_pk}/handgrading_result/?filename=${file}`
        );

        return response.data;
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

export class GroupHandgradingResultSummary {
    extended_due_date: string;
    handgrading_result: {
        finished_grading: boolean;
        total_points: number;
        total_points_possible: number;
    };
    member_names: string[];
    num_submissions: number;
    num_submits_towards_limit: number;
    project: number;
    pk: number;

    constructor({
        extended_due_date,
        handgrading_result,
        member_names,
        num_submissions,
        num_submits_towards_limit,
        project,
        pk,
    }: GroupHandgradingResultSummary) {
        this.extended_due_date = extended_due_date;
        this.handgrading_result = handgrading_result;
        this.member_names = member_names;
        this.num_submissions = num_submissions;
        this.num_submits_towards_limit = num_submits_towards_limit;
        this.project = project;
        this.pk = pk;
    }
}

export class SubmissionGroupHandgradingInfo {
    count: number;
    next: string;
    previous: string;
    results: GroupHandgradingResultSummary[];

    constructor({
        count,
        next,
        previous,
        results
    }: SubmissionGroupHandgradingInfo) {
        this.count = count;
        this.next = next;
        this.previous = previous;
        this.results = results;
    }
}
