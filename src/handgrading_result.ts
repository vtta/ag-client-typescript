import { AppliedAnnotation, AppliedAnnotationData } from './applied_annotation';
import { SaveableAPIObject } from "./base";
import { Comment, CommentData } from "./comment";
import { CriterionResult, CriterionResultData } from './criterion_result';
import { HandgradingRubric, HandgradingRubricData } from './handgrading_rubric';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class HandgradingResultCoreData {
    pk: number;
    last_modified: string;
    submission: number;
    group: number;
    finished_grading: boolean;
    points_adjustment: number;
    submitted_filenames: string[];
    total_points: number;
    total_points_possible: number;

    constructor(args: HandgradingResultCoreData) {
        this.pk = args.pk;
        this.last_modified = args.last_modified;
        this.submission = args.submission;
        this.group = args.group;
        this.finished_grading = args.finished_grading;
        this.points_adjustment = args.points_adjustment;
        this.submitted_filenames = args.submitted_filenames;
        this.total_points = args.total_points;
        this.total_points_possible = args.total_points_possible;
    }
}

interface HandgradingResultCtorArgs extends HandgradingResultCoreData {
    handgrading_rubric: HandgradingRubricData;
    applied_annotations: AppliedAnnotationData[];
    comments: CommentData[];
    criterion_results: CriterionResultData[];
}

export interface HandgradingResultData extends HandgradingResultCtorArgs {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    _handgrading_result_data_brand: unknown;
}

export interface HandgradingResultObserver {
    update_handgrading_result_created(handgrading_result: HandgradingResult): void;
    update_handgrading_result_changed(handgrading_result: HandgradingResult): void;
    update_handgrading_result_deleted(handgrading_result: HandgradingResult): void;
}

export class HandgradingResult extends HandgradingResultCoreData implements SaveableAPIObject {
    // Typescript hack for nominal typing.
    // See https://github.com/Microsoft/Typescript/issues/202
    // and https://michalzalecki.com/nominal-typing-in-typescript/
    private _handgrading_result_brand: unknown;

    handgrading_rubric: HandgradingRubric;
    applied_annotations: AppliedAnnotation[];
    comments: Comment[];
    criterion_results: CriterionResult[];

    constructor(args: HandgradingResultCtorArgs) {
        super(args);

        this.handgrading_rubric = new HandgradingRubric(args.handgrading_rubric);
        this.applied_annotations = args.applied_annotations.map(
            item => new AppliedAnnotation(item));
        this.comments = args.comments.map(item => new Comment(item));
        this.criterion_results = args.criterion_results.map(item => new CriterionResult(item));
    }

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
            `/groups/${group_pk}/handgrading_result/`, {}
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

        safe_assign(this, new HandgradingResult(response.data));
        HandgradingResult.notify_handgrading_result_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<HandgradingResultData>(
            `/groups/${this.group}/handgrading_result/`
        );

        safe_assign(this, new HandgradingResult(response.data));
        if (last_modified !== this.last_modified) {
            HandgradingResult.notify_handgrading_result_changed(this);
        }
    }

    static notify_handgrading_result_changed(handgrading_result: HandgradingResult) {
        for (let subscriber of HandgradingResult._subscribers) {
            subscriber.update_handgrading_result_changed(handgrading_result);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof HandgradingResultCoreData)[] = [
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

    constructor(args: GroupHandgradingResultSummary) {
        this.extended_due_date = args.extended_due_date;
        this.handgrading_result = args.handgrading_result;
        this.member_names = args.member_names;
        this.num_submissions = args.num_submissions;
        this.num_submits_towards_limit = args.num_submits_towards_limit;
        this.project = args.project;
        this.pk = args.pk;
    }
}

export class SubmissionGroupHandgradingInfo {
    count: number;
    next: string;
    previous: string;
    results: GroupHandgradingResultSummary[];

    constructor(args: SubmissionGroupHandgradingInfo) {
        this.count = args.count;
        this.next = args.next;
        this.previous = args.previous;
        this.results = args.results;
    }
}
