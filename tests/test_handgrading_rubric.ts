import {
    Annotation,
    Course, Criterion,
    HandgradingRubric, HandgradingRubricObserver,
    NewAnnotationData, NewCriterionData, NewHandgradingRubricData,
    PointsStyle, Project
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

class TestObserver implements HandgradingRubricObserver {
    handgrading_rubric: HandgradingRubric | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;

    update_handgrading_rubric_changed(handgrading_rubric: HandgradingRubric): void {
        this.changed_count += 1;
        this.handgrading_rubric = handgrading_rubric;
    }

    update_handgrading_rubric_created(handgrading_rubric: HandgradingRubric): void {
        this.created_count += 1;
        this.handgrading_rubric = handgrading_rubric;
    }

    update_handgrading_rubric_deleted(handgrading_rubric: HandgradingRubric): void {
        this.deleted_count += 1;
        this.handgrading_rubric = null;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    observer = new TestObserver();
    HandgradingRubric.subscribe(observer);
});

afterEach(() => {
    HandgradingRubric.unsubscribe(observer);
});

describe('List/create handgrading rubric tests', () => {
    test('Handgrading rubric ctor', () => {
        let now = (new Date()).toISOString();
        let criterion = new Criterion({
            pk: 3,
            handgrading_rubric: 21,
            last_modified: now,
            short_description: "short1",
            long_description: "long1",
            points: 3,
        });

        let annotation = new Annotation({
            pk: 2,
            handgrading_rubric: 21,
            short_description: "short2",
            long_description: "long2",
            deduction: -2,
            max_deduction: null,
            last_modified: now,
        });

        let handgrading_rubric = new HandgradingRubric({
            pk: 21,
            project: project.pk,
            last_modified: now,
            points_style: PointsStyle.start_at_zero_and_add,
            max_points: null,
            show_grades_and_rubric_to_students: false,
            handgraders_can_leave_comments: true,
            handgraders_can_adjust_points: true,
            criteria: [criterion],
            annotations: [annotation],
        });

        expect(handgrading_rubric.pk).toEqual(21);
        expect(handgrading_rubric.project).toEqual(project.pk);
        expect(handgrading_rubric.last_modified).toEqual(now);
        expect(handgrading_rubric.points_style).toEqual(PointsStyle.start_at_zero_and_add);
        expect(handgrading_rubric.max_points).toBeNull();
        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(false);
        expect(handgrading_rubric.handgraders_can_leave_comments).toEqual(true);
        expect(handgrading_rubric.handgraders_can_adjust_points).toEqual(true);

        expect(handgrading_rubric.criteria.length).toEqual(1);
        expect(handgrading_rubric.criteria[0].pk).toEqual(3);
        expect(handgrading_rubric.criteria[0].handgrading_rubric).toEqual(21);
        expect(handgrading_rubric.criteria[0].last_modified).toEqual(now);
        expect(handgrading_rubric.criteria[0].short_description).toEqual("short1");
        expect(handgrading_rubric.criteria[0].long_description).toEqual("long1");
        expect(handgrading_rubric.criteria[0].points).toEqual(3);

        expect(handgrading_rubric.annotations.length).toEqual(1);
        expect(handgrading_rubric.annotations[0].pk).toEqual(2);
        expect(handgrading_rubric.annotations[0].handgrading_rubric).toEqual(21);
        expect(handgrading_rubric.annotations[0].short_description).toEqual("short2");
        expect(handgrading_rubric.annotations[0].long_description).toEqual("long2");
        expect(handgrading_rubric.annotations[0].deduction).toEqual(-2);
        expect(handgrading_rubric.annotations[0].max_deduction).toBeNull();
        expect(handgrading_rubric.annotations[0].last_modified).toEqual(now);
    });

    test('Get handgrading rubric from project', async () => {
        let create_handgrading_rubric = `
from autograder.core.models import Project
from autograder.handgrading.models import HandgradingRubric
project = Project.objects.get(pk=${project.pk})

HandgradingRubric.objects.validate_and_create(project=project, max_points=321)
        `;

        run_in_django_shell(create_handgrading_rubric);
        let loaded_handgrading_rubric = await HandgradingRubric.get_from_project(project.pk);

        // Make sure the loaded HandgradingRubric is the correct one
        let actual_max_points = loaded_handgrading_rubric.max_points;
        expect(actual_max_points).toEqual(321);
    });

    test('Create handgrading rubric only required fields', async () => {
        let created = await HandgradingRubric.create(project.pk, {});
        let loaded = await HandgradingRubric.get_from_project(project.pk);

        expect(created).toEqual(loaded);

        expect(loaded.project).toEqual(project.pk);
        expect(loaded.points_style).toEqual(PointsStyle.start_at_zero_and_add);
        expect(loaded.max_points).toBeNull();
        expect(loaded.show_grades_and_rubric_to_students).toEqual(false);
        expect(loaded.handgraders_can_leave_comments).toEqual(false);
        expect(loaded.handgraders_can_adjust_points).toEqual(false);
        expect(loaded.criteria).toEqual([]);
        expect(loaded.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create handgrading rubric all fields', async () => {
        let created = await HandgradingRubric.create(
            project.pk,
            new NewHandgradingRubricData({
                points_style: PointsStyle.start_at_max_and_subtract,
                max_points: 10,
                show_grades_and_rubric_to_students: true,
                handgraders_can_leave_comments: false,
                handgraders_can_adjust_points: false,
            })
        );

        let actual = await HandgradingRubric.get_from_project(project.pk);
        expect(created).toEqual(actual);

        expect(actual.points_style).toEqual(PointsStyle.start_at_max_and_subtract);
        expect(actual.max_points).toEqual(10);
        expect(actual.show_grades_and_rubric_to_students).toEqual(true);
        expect(actual.handgraders_can_leave_comments).toEqual(false);
        expect(actual.handgraders_can_adjust_points).toEqual(false);
        expect(actual.criteria).toEqual([]);
        expect(actual.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let handgrading_rubric = await HandgradingRubric.create(
            project.pk, {});

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        HandgradingRubric.unsubscribe(observer);

        await handgrading_rubric.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete handgrading rubric tests', () => {
    let handgrading_rubric!: HandgradingRubric;

    beforeEach(async () => {
        handgrading_rubric = await HandgradingRubric.create(project.pk, {});
    });

    test('Get handgrading rubric', async () => {
        let loaded = await HandgradingRubric.get_by_pk(handgrading_rubric.pk);
        expect(loaded).toEqual(handgrading_rubric);
    });

    test('Get handgrading rubric with criteria and annotations', async () => {
        let criterion = await Criterion.create(handgrading_rubric.pk, new NewCriterionData({
            short_description: "short 1",
            long_description: "long 1",
            points: 20,
        }));

        let annotation = await Annotation.create(handgrading_rubric.pk, new NewAnnotationData({
            short_description: "short 2",
            long_description: "long 2",
            deduction: -40,
        }));

        let loaded = await HandgradingRubric.get_from_project(project.pk);
        expect(loaded).not.toEqual(handgrading_rubric);

        // Check that all fields match except for criteria and annotations
        expect(loaded.points_style).toEqual(handgrading_rubric.points_style);
        expect(loaded.max_points).toEqual(handgrading_rubric.max_points);
        expect(loaded.show_grades_and_rubric_to_students).toEqual(
            handgrading_rubric.show_grades_and_rubric_to_students);
        expect(loaded.handgraders_can_leave_comments).toEqual(
            handgrading_rubric.handgraders_can_leave_comments);
        expect(loaded.handgraders_can_adjust_points).toEqual(
            handgrading_rubric.handgraders_can_adjust_points);

        // Check criteria and annotations
        expect(loaded.criteria).not.toEqual(handgrading_rubric.criteria);
        expect(loaded.annotations).not.toEqual(handgrading_rubric.annotations);
        expect(loaded.criteria).toEqual([criterion]);
        expect(loaded.annotations).toEqual([annotation]);
    });

    test('Update handgrading rubric', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        handgrading_rubric.points_style = PointsStyle.start_at_max_and_subtract;
        handgrading_rubric.max_points = 2;
        handgrading_rubric.show_grades_and_rubric_to_students = true;
        handgrading_rubric.handgraders_can_adjust_points = true;
        handgrading_rubric.handgraders_can_leave_comments = true;

        await sleep(1);
        await handgrading_rubric.save();

        let loaded = await HandgradingRubric.get_by_pk(handgrading_rubric.pk);
        expect(loaded.points_style).toEqual(PointsStyle.start_at_max_and_subtract);
        expect(loaded.max_points).toEqual(2);
        expect(loaded.show_grades_and_rubric_to_students).toEqual(true);
        expect(loaded.handgraders_can_adjust_points).toEqual(true);
        expect(loaded.handgraders_can_leave_comments).toEqual(true);

        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(handgrading_rubric).toEqual(loaded);

        expect(observer.handgrading_rubric).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(HandgradingRubric, 'HandgradingRubric',
                                'autograder.handgrading.models');
    });

    test('Refresh handgrading rubric', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        await sleep(1);

        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(false);

        let change_handgrading_rubric = `
from autograder.handgrading.models import HandgradingRubric

handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})
handgrading_rubric.validate_and_update(show_grades_and_rubric_to_students=True)
        `;
        run_in_django_shell(change_handgrading_rubric);

        await handgrading_rubric.refresh();

        expect(handgrading_rubric.show_grades_and_rubric_to_students).toEqual(true);
        expect_dates_not_equal(handgrading_rubric.last_modified, old_timestamp);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Refresh handgrading rubric on criteria and annotations change', async () => {
        let old_timestamp = handgrading_rubric.last_modified;
        await sleep(1);

        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(handgrading_rubric.criteria).toEqual([]);
        expect(handgrading_rubric.annotations).toEqual([]);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        // Create criterion and annotation (should change handgrading rubric response)
        let criterion = await Criterion.create(handgrading_rubric.pk, new NewCriterionData({
            short_description: "short 1",
            long_description: "long 1",
            points: 20,
        }));

        let annotation = await Annotation.create(handgrading_rubric.pk, new NewAnnotationData({
            short_description: "short 2",
            long_description: "long 2",
            deduction: -40,
        }));

        // Last modified doesn't change, but criteria and annotation does
        await handgrading_rubric.refresh();
        expect_dates_equal(handgrading_rubric.last_modified, old_timestamp);
        expect(handgrading_rubric.criteria).toEqual([criterion]);
        expect(handgrading_rubric.annotations).toEqual([annotation]);

        expect(observer.handgrading_rubric).toEqual(handgrading_rubric);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);  // Observer isn't notified of this change
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete handgrading rubric', async () => {
        await handgrading_rubric.delete();

        expect(observer.handgrading_rubric).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        // TODO: Check that it is actually deleted somehow?
    });
});
