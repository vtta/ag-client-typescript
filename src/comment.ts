import { Location } from "./applied_annotation";
import { Deletable, SaveableAPIObject } from "./base";
import { HttpClient } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class CommentData {
    pk: number;
    last_modified: string;
    location: Location | null;
    text: string;
    handgrading_result: number;

    constructor(args: CommentData) {
        this.pk = args.pk;
        this.last_modified = args.last_modified;
        this.location = args.location;
        this.text = args.text;
        this.handgrading_result = args.handgrading_result;
    }
}

export interface CommentObserver {
    update_comment_created(comment: Comment): void;
    update_comment_changed(comment: Comment): void;
    update_comment_deleted(comment: Comment): void;
}

export class Comment extends CommentData implements SaveableAPIObject, Deletable {
    private static _subscribers = new Set<CommentObserver>();

    static subscribe(observer: CommentObserver) {
        Comment._subscribers.add(observer);
    }

    static unsubscribe(observer: CommentObserver) {
        Comment._subscribers.delete(observer);
    }

    static async get_all_from_handgrading_result(
        handgrading_result_pk: number): Promise<Comment[]> {
        let response = await HttpClient.get_instance().get<CommentData[]>(
            `/handgrading_results/${handgrading_result_pk}/comments/`
        );
        return response.data.map((data) => new Comment(data));
    }

    static async get_by_pk(comment_pk: number): Promise<Comment> {
        let response = await HttpClient.get_instance().get<CommentData>(
            `/comments/${comment_pk}/`
        );
        return new Comment(response.data);
    }

    static async create(handgrading_result_pk: number, data: NewCommentData): Promise<Comment> {
        let response = await HttpClient.get_instance().post<CommentData>(
            `/handgrading_results/${handgrading_result_pk}/comments/`,
            data
        );
        let result = new Comment(response.data);
        Comment.notify_comment_created(result);
        return result;
    }

    static notify_comment_created(comment: Comment) {
        for (let subscriber of Comment._subscribers) {
            subscriber.update_comment_created(comment);
        }
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<CommentData>(
            `/comments/${this.pk}/`,
            filter_keys(this, Comment.EDITABLE_FIELDS)
        );

        safe_assign(this, response.data);
        Comment.notify_comment_changed(this);
    }

    async refresh(): Promise<void> {
        let last_modified = this.last_modified;
        let response = await HttpClient.get_instance().get<CommentData>(
            `/comments/${this.pk}/`
        );

        safe_assign(this, response.data);
        if (last_modified !== this.last_modified) {
            Comment.notify_comment_changed(this);
        }
    }

    static notify_comment_changed(comment: Comment) {
        for (let subscriber of Comment._subscribers) {
            subscriber.update_comment_changed(comment);
        }
    }

    async delete(): Promise<void> {
        await HttpClient.get_instance().delete(
            `/comments/${this.pk}/`
        );
        Comment.notify_comment_deleted(this);
    }

    static notify_comment_deleted(comment: Comment) {
        for (let subscriber of Comment._subscribers) {
            subscriber.update_comment_deleted(comment);
        }
    }

    static readonly EDITABLE_FIELDS: (keyof CommentData)[] = [
        'text',
    ];
}

export class NewCommentData {
    text: string;
    location?: Location;

    constructor(args: NewCommentData) {
        this.text = args.text;
        this.location = args.location;
    }
}
