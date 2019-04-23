import {
    Annotation, AppliedAnnotation,
    Comment,
    Course, Criterion, CriterionResult, ExpectedStudentFile, Group,
    HandgradingResult, HandgradingResultObserver,
    HandgradingRubric,
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
let group!: Group;

class TestObserver implements HandgradingResultObserver {
    handgrading_result: HandgradingResult | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_handgrading_result_changed(handgrading_result: HandgradingResult): void {
        this.changed_count += 1;
        this.handgrading_result = handgrading_result;
    }

    update_handgrading_result_created(handgrading_result: HandgradingResult): void {
        this.created_count += 1;
        this.handgrading_result = handgrading_result;
    }

    update_handgrading_result_deleted(handgrading_result: HandgradingResult): void {
        this.deleted_count += 1;
        this.handgrading_result = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project', guests_can_submit: true});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    await ExpectedStudentFile.create(project.pk, {pattern: 'f1.txt'});      // for submission
    group = await Group.create_solo_group(project.pk);

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

    observer = new TestObserver();
    HandgradingResult.subscribe(observer);
});

afterEach(() => {
    HandgradingResult.unsubscribe(observer);
});

describe('List/create handgrading result tests', () => {
    test('Handgrading result ctor', () => {
        let now = (new Date()).toISOString();
        let applied_annotations = [
            // Should work with AppliedAnnotationData and AppliedAnnotation
            {
                pk: 1,
                last_modified: now,
                location: {
                    pk: 2,
                    first_line: 3,
                    last_line: 4,
                    filename: 'file1.txt',
                    last_modified: now,
                },
                annotation: new Annotation({
                    pk: 2,
                    handgrading_rubric: handgrading_rubric.pk,
                    short_description: "short1",
                    long_description: "long1",
                    deduction: -1,
                    max_deduction: -1,
                    last_modified: now,
                }),
                handgrading_result: 22,
            },
            // Should work with AppliedAnnotationData and AppliedAnnotation
            new AppliedAnnotation({
                pk: 2,
                last_modified: now,
                location: {
                    pk: 2,
                    first_line: 2,
                    last_line: 3,
                    filename: 'file1.txt',
                    last_modified: now,
                },
                annotation: new Annotation({
                    pk: 2,
                    handgrading_rubric: handgrading_rubric.pk,
                    short_description: "short2",
                    long_description: "long2",
                    deduction: -2,
                    max_deduction: -2,
                    last_modified: now,
                }),
                handgrading_result: 22,
            })
        ];

        let criterion_results = [
            // Should work with CriterionResultData and CriterionResult
            {
                pk: 1,
                last_modified: now,
                selected: false,
                criterion: new Criterion({
                    pk: 1,
                    handgrading_rubric: handgrading_rubric.pk,
                    last_modified: now,
                    short_description: "short",
                    long_description: "long",
                    points: 7,
                }),
                handgrading_result: 22,
            },
            // Should work with CriterionResultData and CriterionResult
            new CriterionResult({
                pk: 2,
                last_modified: now,
                selected: true,
                criterion: new Criterion({
                    pk: 2,
                    handgrading_rubric: handgrading_rubric.pk,
                    last_modified: now,
                    short_description: "short2",
                    long_description: "long2",
                    points: 5,
                }),
                handgrading_result: 22,
            })
        ];

        let comments = [
            // Should work with CommentData and Comment
            {
                pk: 1,
                last_modified: now,
                location: {
                    pk: 1,
                    first_line: 2,
                    last_line: 3,
                    filename: 'file1.txt',
                },
                text: "sample comment",
                handgrading_result: 22,
            },
            // Should work with CommentData and Comment
            new Comment({
                pk: 2,
                last_modified: now,
                location: {
                    pk: 2,
                    first_line: 3,
                    last_line: 4,
                    filename: 'file1.txt',
                },
                text: "sample comment 2",
                handgrading_result: 22,
            })
        ];

        let handgrading_result = new HandgradingResult({
            pk: 22,
            last_modified: now,
            submission: 2,
            handgrading_rubric: handgrading_rubric,
            group: 2,
            applied_annotations: applied_annotations,
            comments: comments,
            criterion_results: criterion_results,
            finished_grading: false,
            points_adjustment: 0,
            submitted_filenames: ['file1.txt'],
            total_points: 10,
            total_points_possible: 10,
        });

        expect(handgrading_result.pk).toEqual(22);
        expect(handgrading_result.last_modified).toEqual(now);
        expect(handgrading_result.submission).toEqual(2);
        expect(handgrading_result.handgrading_rubric).toEqual(handgrading_rubric);
        expect(handgrading_result.group).toEqual(2);
        expect(handgrading_result.finished_grading).toEqual(false);
        expect(handgrading_result.points_adjustment).toEqual(0);
        expect(handgrading_result.submitted_filenames).toEqual(['file1.txt']);
        expect(handgrading_result.total_points).toEqual(10);
        expect(handgrading_result.total_points_possible).toEqual(10);

        expect(handgrading_result.applied_annotations).toEqual(
            [new AppliedAnnotation(applied_annotations[0]), applied_annotations[1]]);
        expect(handgrading_result.comments).toEqual([new Comment(comments[0]), comments[1]]);
        expect(handgrading_result.criterion_results).toEqual(
            [new CriterionResult(criterion_results[0]), criterion_results[1]]);
    });

    test('List handgrading results from project no next or previous', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
group = Group.objects.get(pk=${group.pk})

member2 = User.objects.get_or_create(username='ffuxa@umich.edu')[0]
group2 = Group.objects.validate_and_create(project=project, members=[member2])

submission1 = Submission.objects.validate_and_create(group=group,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])

HandgradingResult.objects.validate_and_create(group=group, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
        `;

        run_in_django_shell(create_handgrading_results);
        await sleep(2);
        let loaded_handgrading_results_info =
            await HandgradingResult.get_all_summary_from_project(project.pk);

        expect(loaded_handgrading_results_info.count).toEqual(2);
        expect(loaded_handgrading_results_info.next).toBeNull();
        expect(loaded_handgrading_results_info.previous).toBeNull();

        let actual_total_points = loaded_handgrading_results_info.results.map(
            result => result.handgrading_result.total_points);
        expect(actual_total_points.sort()).toEqual([2, 5]);
    });


    test('List handgrading results from project with next and previous', async () => {
        let create_handgrading_results = `
from autograder.core.models import Group, Project, Submission
from autograder.handgrading.models import HandgradingRubric, HandgradingResult
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User

project = Project.objects.get(pk=${project.pk})
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})

member1 = User.objects.get_or_create(username='ffuxa@umich.edu')[0]
member2 = User.objects.get_or_create(username='thisisarealname@umich.edu')[0]

group1 = Group.objects.get(pk=${group.pk})
group2 = Group.objects.validate_and_create(project=project, members=[member1])
group3 = Group.objects.validate_and_create(project=project, members=[member2])

submission1 = Submission.objects.validate_and_create(group=group1,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah1')])
submission2 = Submission.objects.validate_and_create(group=group2,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah2')])
submission3 = Submission.objects.validate_and_create(group=group3,
    submitted_files=[SimpleUploadedFile('f1.txt', b'blah3')])

HandgradingResult.objects.validate_and_create(group=group1, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=2, submission=submission1)
HandgradingResult.objects.validate_and_create(group=group2, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=5, submission=submission2)
HandgradingResult.objects.validate_and_create(group=group3, handgrading_rubric=handgrading_rubric,
                                              points_adjustment=4, submission=submission3)
        `;

        run_in_django_shell(create_handgrading_results);
        let loaded_second_handgrading_results_page =
            await HandgradingResult.get_all_summary_from_project(project.pk, '', 1, 2);

        expect(loaded_second_handgrading_results_page.count).toEqual(3);

        let next_url_without_base = remove_base_url(loaded_second_handgrading_results_page.next);
        let previous_url_without_base = remove_base_url(
            loaded_second_handgrading_results_page.previous);

        expect(next_url_without_base).toBe(
            "/api/projects/1/handgrading_results/?include_staff=true&page=3&page_size=1");
        expect(previous_url_without_base).toBe(
            "/api/projects/1/handgrading_results/?include_staff=true&page_size=1"
        );
        expect(loaded_second_handgrading_results_page.results.length).toBe(1);
    });

    test('Create handgrading result', async () => {
        let created = await HandgradingResult.get_or_create(group.pk);

        // First check if result from summary matches
        let loaded_summary = await HandgradingResult.get_all_summary_from_project(project.pk);
        expect(loaded_summary.count).toEqual(1);
        let actual_result_summary = loaded_summary.results[0];

        expect(created.pk).toEqual(actual_result_summary.pk);

        expect(actual_result_summary.handgrading_result.finished_grading).toEqual(false);
        expect(actual_result_summary.handgrading_result.total_points).toEqual(0);
        expect(actual_result_summary.handgrading_result.total_points_possible).toEqual(0);

        // If statement included to suppress tslint "object could be null" error
        if (observer.handgrading_result) {
            expect(observer.handgrading_result.pk).toEqual(actual_result_summary.pk);
        }
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        // Now get handgrading result with pk and check if it matches
        let actual_result = await HandgradingResult.get_by_group_pk(group.pk);

        expect(created).toEqual(actual_result);

        expect(actual_result.submission).toEqual(1);
        expect(actual_result.handgrading_rubric).toEqual(handgrading_rubric);
        expect(actual_result.group).toEqual(group.pk);
        expect(actual_result.applied_annotations).toEqual([]);
        expect(actual_result.comments).toEqual([]);
        expect(actual_result.criterion_results).toEqual([]);
        expect(actual_result.finished_grading).toEqual(false);
        expect(actual_result.points_adjustment).toEqual(0);
        expect(actual_result.submitted_filenames).toEqual(['f1.txt']);
        expect(actual_result.total_points).toEqual(0);
        expect(actual_result.total_points_possible).toEqual(0);

        expect(observer.handgrading_result).toEqual(actual_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let handgrading_result = await HandgradingResult.get_or_create(group.pk);

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        HandgradingResult.unsubscribe(observer);

        await handgrading_result.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete handgrading result tests', () => {
    let handgrading_result!: HandgradingResult;

    beforeEach(async () => {
        handgrading_result = await HandgradingResult.get_or_create(group.pk);
    });

    test('Get handgrading result', async () => {
        let loaded = await HandgradingResult.get_by_group_pk(group.pk);
        expect(loaded).toEqual(handgrading_result);
    });

    test('Update handgrading result', async () => {
        let old_timestamp = handgrading_result.last_modified;
        handgrading_result.finished_grading = true;
        handgrading_result.points_adjustment = 2;

        await sleep(1);
        await handgrading_result.save();

        let loaded = await HandgradingResult.get_by_group_pk(group.pk);
        expect(loaded.finished_grading).toEqual(true);
        expect(loaded.points_adjustment).toEqual(2);
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(handgrading_result).toEqual(loaded);

        expect(observer.handgrading_result).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(
            HandgradingResult, 'HandgradingResult', 'autograder.handgrading.models');
    });

    test('Refresh handgrading result', async () => {
        let old_timestamp = handgrading_result.last_modified;
        await sleep(1);

        await handgrading_result.refresh();
        expect_dates_equal(handgrading_result.last_modified, old_timestamp);
        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        let change_handgrading_result = `
from autograder.handgrading.models import HandgradingResult

handgrading_result = HandgradingResult.objects.get(pk=${handgrading_result.pk})
handgrading_result.validate_and_update(finished_grading=True)
        `;
        run_in_django_shell(change_handgrading_result);

        await handgrading_result.refresh();

        expect(handgrading_result.finished_grading).toEqual(true);
        expect_dates_not_equal(handgrading_result.last_modified, old_timestamp);

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Get file from handgrading result', async () => {
        let loaded_file = await HandgradingResult.get_file_from_handgrading_result(
            group.pk, "f1.txt");

        expect(loaded_file).toEqual('blah');

        expect(observer.handgrading_result).toEqual(handgrading_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Get instead of create from project', async () => {
        let loaded = await HandgradingResult.get_or_create(group.pk);

        expect(loaded).toEqual(handgrading_result);

        // Created count shouldn't increase
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });
});


function remove_base_url(url: string) {
    /*
     * Replace base URL in given string, if it exists, and return the result.
     *
     * e.g. "http://localhost:9000/api/v1/blah/" becomes "/api/v1/blah/"
     *      "/api/v1/blah/" stays "/api/v1/blah/"
     *
     * Source:
     *      http://www.wkoorts.com/wkblog/2012/10/09/javascript-snippet-remove-base-url-from-link/
     */
    let base_url_pattern = /^https?:\/\/[a-z:0-9.]+/;
    let result = "";

    let match = base_url_pattern.exec(url);
    if (match !== null) {
        result = match[0];
    }

    if (result.length > 0) {
        url = url.replace(result, "");
    }

    return url;
}
