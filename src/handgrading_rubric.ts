import { Annotation } from './annotation';
import { Deletable, SaveableAPIObject } from "./base";
import { Criterion } from './criterion';
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

import {
    sleep,
} from '../tests/utils';

export class HandgradingRubricData {
    pk: number;
    project: number;
    last_modified: string;
    points_style: PointsStyle;
    max_points: number | null;
    show_grades_and_rubric_to_students: boolean;
    handgraders_can_leave_comments: boolean;
    handgraders_can_adjust_points: boolean;
    criteria: Criterion[];
    annotations: Annotation[];

    constructor({
        pk,
        project,
        last_modified,
        points_style,
        max_points,
        show_grades_and_rubric_to_students,
        handgraders_can_leave_comments,
        handgraders_can_adjust_points,
        criteria,
        annotations,
    }: HandgradingRubricData) {
        this.pk = pk;
        this.project = project;
        this.last_modified = last_modified;
        this.points_style = points_style;
        this.max_points = max_points;
        this.show_grades_and_rubric_to_students = show_grades_and_rubric_to_students;
        this.handgraders_can_leave_comments = handgraders_can_leave_comments;
        this.handgraders_can_adjust_points = handgraders_can_adjust_points;
        this.criteria = criteria;
        this.annotations = annotations;
    }
}

export interface HandgradingRubricObserver {
    update_handgrading_rubric_created(handgrading_rubric: HandgradingRubric): void;
    update_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric): void;
    update_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric): void;
}

export class HandgradingRubric extends HandgradingRubricData implements SaveableAPIObject,
    Deletable {
    private static _subscribers = new Set<HandgradingRubricObserver>();

    static subscribe(observer: HandgradingRubricObserver) {
        HandgradingRubric._subscribers.add(observer);
    }

    static unsubscribe(observer: HandgradingRubricObserver) {
        HandgradingRubric._subscribers.delete(observer);
    }

    static async get_from_project(project_pk: number): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/projects/${project_pk}/handgrading_rubric/`
        );
        return new HandgradingRubric(response.data);
    }

    static async get_by_pk(handgrading_rubric_pk: number): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/handgrading_rubrics/${handgrading_rubric_pk}/`
        );
        return new HandgradingRubric(response.data);
    }

    static async create(project_pk: number,
                        data: NewHandgradingRubricData): Promise<HandgradingRubric> {
        let response = await HttpClient.get_instance().post<HandgradingRubricData>(
            `/projects/${project_pk}/handgrading_rubric/`,
            data
        );
        let result = new HandgradingRubric(response.data);
        HandgradingRubric.notify_handgrading_rubric_created(result);
        return result;
    }

    static notify_handgrading_rubric_created(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_created(handgrading_rubric);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<HandgradingRubricData>(
            `/handgrading_rubrics/${this.pk}/`,
            filter_keys(this, HandgradingRubric.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        HandgradingRubric.notify_handgrading_rubric_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<HandgradingRubricData>(
            `/handgrading_rubrics/${this.pk}/`
        );
        safe_assign(this, response.data);

        if (last_modified !== this.last_modified) {
            HandgradingRubric.notify_handgrading_rubric_changed(this);
        }
    }

    static notify_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_changed(handgrading_rubric);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/handgrading_rubrics/${this.pk}/`
        );
        HandgradingRubric.notify_handgrading_rubric_deleted(this);
    }

    static notify_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric) {
        for (let subscriber of HandgradingRubric._subscribers) {
            subscriber.update_handgrading_rubric_deleted(handgrading_rubric);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof HandgradingRubricData)[] = [
        'points_style',
        'max_points',
        'show_grades_and_rubric_to_students',
        'handgraders_can_leave_comments',
        'handgraders_can_adjust_points',
    ];
}

export class NewHandgradingRubricData {
    points_style?: string;
    max_points?: number;
    show_grades_and_rubric_to_students?: boolean;
    handgraders_can_leave_comments?: boolean;
    handgraders_can_adjust_points?: boolean;

    constructor({
        points_style,
        max_points,
        show_grades_and_rubric_to_students,
        handgraders_can_leave_comments,
        handgraders_can_adjust_points,
    }: NewHandgradingRubricData) {
        this.points_style = points_style;
        this.max_points = max_points;
        this.show_grades_and_rubric_to_students = show_grades_and_rubric_to_students;
        this.handgraders_can_leave_comments = handgraders_can_leave_comments;
        this.handgraders_can_adjust_points = handgraders_can_adjust_points;
    }
}

export enum PointsStyle {
    start_at_zero_and_add = 'start_at_zero_and_add',
    start_at_max_and_subtract = 'start_at_max_and_subtract',
}
