import {
    Comment,
    CommentObserver, Course, ExpectedStudentFile, Group, HandgradingResult, HandgradingRubric,
    NewCommentData,
    Project
} from '..';

import {
    do_editable_fields_test,
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell, sleep,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;
let handgrading_rubric!: HandgradingRubric;
let handgrading_result!: HandgradingResult;

class TestObserver implements CommentObserver {
    comment: Comment | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_comment_changed(comment: Comment): void {
        this.changed_count += 1;
        this.comment = comment;
    }

    update_comment_created(comment: Comment): void {
        this.created_count += 1;
        this.comment = comment;
    }

    update_comment_deleted(comment: Comment): void {
        this.deleted_count += 1;
        this.comment = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    await ExpectedStudentFile.create(project.pk, {pattern: 'f1.txt'});      // for submission
    let group = await Group.create_solo_group(project.pk);

    // Create submission (using django shell since Submission API hasn't been created yet
    let create_submission = `
from autograder.core.models import Project, Group, Submission
from django.core.files.uploadedfile import SimpleUploadedFile

project = Project.objects.get(pk=${project.pk})
group = Group.objects.get(pk=${group.pk})
submission = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah')])

submission.status = Submission.GradingStatus.finished_grading
submission.save()
`;
    run_in_django_shell(create_submission);

    handgrading_result = await HandgradingResult.get_or_create(group.pk);
    observer = new TestObserver();
    Comment.subscribe(observer);
});

afterEach(() => {
    Comment.unsubscribe(observer);
});

describe('List/create comment tests', () => {
    test('Comment ctor', () => {
        let now = (new Date()).toISOString();
        let comment = new Comment({
            pk: 6,
            last_modified: now,
            location: null,
            text: "comment text",
            handgrading_result: handgrading_result.pk,
        });

        expect(comment.pk).toEqual(6);
        expect(comment.last_modified).toEqual(now);
        expect(comment.location).toEqual(null);
        expect(comment.text).toEqual("comment text");
        expect(comment.handgrading_result).toEqual(handgrading_result.pk);
    });

    test('List comment', async () => {
        let create_comments = `
from autograder.handgrading.models import HandgradingResult, Comment
result = HandgradingResult.objects.get(pk=${handgrading_result.pk})

Comment.objects.validate_and_create(handgrading_result=result, text='comment 1')
Comment.objects.validate_and_create(handgrading_result=result, text='comment 2')
Comment.objects.validate_and_create(handgrading_result=result, text='comment 3')
        `;
        run_in_django_shell(create_comments);

        let loaded_comments = await Comment.get_all_from_handgrading_result(
            handgrading_result.pk);

        let actual_text = loaded_comments.map((comment) => comment.text);
        expect(actual_text.sort()).toEqual(['comment 1', 'comment 2', 'comment 3']);
    });

    test('Create comment only required fields', async () => {
        let created = await Comment.create(project.pk, new NewCommentData({text: 'comment text'}));

        let loaded = await Comment.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.text).toEqual('comment text');
        expect(actual.location).toEqual(null);

        expect(observer.comment).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create comment all fields', async () => {
        let created = await Comment.create(
            project.pk,
            new NewCommentData({
                text: 'some other text',
                location: {
                    filename: "f1.txt",
                    first_line: 0,
                    last_line: 1
                }
            })
        );

        let loaded = await Comment.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.text).toEqual('some other text');
        // Used to disable "object might be null" error
        if (actual.location !== null) {
            expect(actual.location.filename).toEqual("f1.txt");
            expect(actual.location.first_line).toEqual(0);
            expect(actual.location.last_line).toEqual(1);
        }
        else {
            throw new Error("Location should not be null");
        }

        expect(observer.comment).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let comment = await Comment.create(handgrading_result.pk, {text: 'texty mctextface'});

        expect(observer.comment).toEqual(comment);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        Comment.unsubscribe(observer);

        await comment.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete comment tests', () => {
    let comment!: Comment;

    beforeEach(async () => {
        comment = await Comment.create(project.pk, {text: 'text here'});
    });

    test('Get comment file', async () => {
        let loaded = await Comment.get_by_pk(comment.pk);
        expect(loaded).toEqual(comment);
    });

    test('Update comment', async () => {
        let old_timestamp = comment.last_modified;
        comment.text = 'aaahhh';

        await sleep(1);
        await comment.save();

        let loaded = await Comment.get_by_pk(comment.pk);
        expect(loaded.text).toEqual('aaahhh');
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(comment).toEqual(loaded);

        expect(observer.comment).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(Comment, 'Comment', 'autograder.handgrading.models');
    });

    test('Refresh comment', async () => {
        let old_timestamp = comment.last_modified;
        await sleep(1);

        await comment.refresh();
        expect_dates_equal(comment.last_modified, old_timestamp);
        expect(observer.comment).toEqual(comment);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        let change_comment = `
from autograder.handgrading.models import Comment

comment = Comment.objects.get(pk=${comment.pk})
comment.validate_and_update(text='something different!')
        `;
        run_in_django_shell(change_comment);

        await comment.refresh();

        expect(comment.text).toEqual('something different!');
        expect_dates_not_equal(comment.last_modified, old_timestamp);

        expect(observer.comment).toEqual(comment);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete comment', async () => {
        await comment.delete();

        expect(observer.comment).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        let loaded_list = await Comment.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded_list.length).toEqual(0);
    });
});
