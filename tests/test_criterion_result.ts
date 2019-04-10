import {
    Course,
    Criterion,
    CriterionResult, CriterionResultData, CriterionResultObserver,
    ExpectedStudentFile,
    Group,
    HandgradingResult,
    HandgradingRubric, NewCriterionResultData,
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
let criterion!: Criterion;

class TestObserver implements CriterionResultObserver {
    criterion_result: CriterionResult | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_criterion_result_changed(criterion_result: CriterionResult): void {
        this.changed_count += 1;
        this.criterion_result = criterion_result;
    }

    update_criterion_result_created(criterion_result: CriterionResult): void {
        this.created_count += 1;
        this.criterion_result = criterion_result;
    }

    update_criterion_result_deleted(criterion_result: CriterionResult): void {
        this.deleted_count += 1;
        this.criterion_result = null;
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
    criterion = await Criterion.create(handgrading_rubric.pk, {});

    observer = new TestObserver();
    CriterionResult.subscribe(observer);
});

afterEach(() => {
    CriterionResult.unsubscribe(observer);
});

describe('List/create criterion result tests', () => {
    test('Criterion result ctor', () => {
        let now = (new Date()).toISOString();
        let expected_student_file = new CriterionResult({
            pk: 6,
            last_modified: now,
            selected: false,
            criterion: criterion,
            handgrading_result: handgrading_result.pk,
        });

        expect(expected_student_file.pk).toEqual(6);
        expect(expected_student_file.last_modified).toEqual(now);
        expect(expected_student_file.selected).toEqual(false);
        expect(expected_student_file.criterion).toEqual(criterion);
        expect(expected_student_file.handgrading_result).toEqual(handgrading_result.pk);
    });

    test('List criterion result', async () => {
        let create_criterion_result = `
from autograder.handgrading.models import (
    HandgradingResult, CriterionResult, Criterion, HandgradingRubric
)
rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
result = HandgradingResult.objects.get(pk=${handgrading_result.pk})

c2 = Criterion.objects.validate_and_create(handgrading_rubric=rubric)
c3 = Criterion.objects.validate_and_create(handgrading_rubric=rubric)

CriterionResult.objects.validate_and_create(handgrading_result=result, selected=True, criterion=c2)
CriterionResult.objects.validate_and_create(handgrading_result=result, selected=True, criterion=c3)
        `;
        run_in_django_shell(create_criterion_result);

        let loaded_criterion_result = await CriterionResult.get_all_from_handgrading_result(
            handgrading_result.pk);

        let actual_selected = loaded_criterion_result.map(
            (criterion_result) => criterion_result.selected);
        expect(actual_selected.sort()).toEqual([false, true, true]);
    });

    test('Create criterion result only required fields', async () => {
        let created = await CriterionResult.create(
            project.pk, {criterion: criterion.pk, selected: false});

        let loaded = await CriterionResult.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.criterion).toEqual(criterion);
        expect(actual.selected).toEqual(false);

        expect(observer.criterion_result).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create criterion result all fields', async () => {
        let created = await CriterionResult.create(
            handgrading_result.pk,
            new NewCriterionResultData({
                criterion: criterion.pk,
                selected: true,
            })
        );

        let loaded = await CriterionResult.get_all_from_handgrading_result(handgrading_result.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.criterion).toEqual(criterion);
        expect(actual.selected).toEqual(true);

        expect(observer.criterion_result).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let criterion_result = await CriterionResult.create(
            handgrading_result.pk, {criterion: criterion.pk});

        expect(observer.criterion_result).toEqual(criterion_result);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        CriterionResult.unsubscribe(observer);

        await criterion_result.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});
