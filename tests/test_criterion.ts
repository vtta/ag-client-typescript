import {
    Course,
    Criterion,
    CriterionObserver, HandgradingRubric, NewCriterionData,
    Project
} from '..';

import {
    do_editable_fields_test,
    expect_dates_equal,
    expect_dates_not_equal,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;
let handgrading_rubric!: HandgradingRubric;

class TestObserver implements CriterionObserver {
    criterion: Criterion | null = null;
    criterion_list: number[] | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;
    order_changed_count = 0;

    update_criterion_changed(criterion: Criterion): void {
        this.changed_count += 1;
        this.criterion = criterion;
    }

    update_criterion_created(criterion: Criterion): void {
        this.created_count += 1;
        this.criterion = criterion;
    }

    update_criterion_deleted(criterion: Criterion): void {
        this.deleted_count += 1;
        this.criterion = null;
    }

    update_criteria_order_changed(criterion_list: number[]): void {
        this.order_changed_count += 1;
        this.criterion_list = criterion_list;
    }
}

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create(course.pk, {name: 'Project'});
    handgrading_rubric = await HandgradingRubric.create(project.pk, {});

    observer = new TestObserver();
    Criterion.subscribe(observer);
});

afterEach(() => {
    Criterion.unsubscribe(observer);
});

describe('List/create criterion tests', () => {
    test('Criterion ctor', () => {
        let now = (new Date()).toISOString();
        let criterion = new Criterion({
            pk: 7,
            handgrading_rubric: handgrading_rubric.pk,
            last_modified: now,
            short_description: "short",
            long_description: "looong",
            points: 10,
        });

        expect(criterion.pk).toEqual(7);
        expect(criterion.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(criterion.last_modified).toEqual(now);
        expect(criterion.short_description).toEqual("short");
        expect(criterion.long_description).toEqual("looong");
        expect(criterion.points).toEqual(10);
    });

    test('List criteria', async () => {
        let create_criteria = `
from autograder.core.models import Project
from autograder.handgrading.models import HandgradingRubric, Criterion
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})

Criterion.objects.validate_and_create(handgrading_rubric=handgrading_rubric, points=3)
Criterion.objects.validate_and_create(handgrading_rubric=handgrading_rubric, points=2)
Criterion.objects.validate_and_create(handgrading_rubric=handgrading_rubric, points=11)
        `;
        run_in_django_shell(create_criteria);

        let loaded_criteria = await Criterion.get_all_from_handgrading_rubric(
            handgrading_rubric.pk);

        let actual_points = loaded_criteria.map(
            (criterion) => criterion.points);
        expect(actual_points.sort((a, b) => a - b)).toEqual([2, 3, 11]);
    });

    test('Create criterion only required fields', async () => {
        let created = await Criterion.create(handgrading_rubric.pk, {});

        let loaded = await Criterion.get_all_from_handgrading_rubric(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.points).toEqual(0);
        expect(actual.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(actual.short_description).toEqual("");
        expect(actual.long_description).toEqual("");

        expect(observer.criterion).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create criterion all fields', async () => {
        let created = await Criterion.create(
            handgrading_rubric.pk,
            new NewCriterionData({
                points: 21,
                short_description: "shorty",
                long_description: "longy"
            })
        );

        let loaded = await Criterion.get_all_from_handgrading_rubric(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.points).toEqual(21);
        expect(actual.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(actual.short_description).toEqual("shorty");
        expect(actual.long_description).toEqual("longy");

        expect(observer.criterion).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let criterion = await Criterion.create(handgrading_rubric.pk, {});

        expect(observer.criterion).toEqual(criterion);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        Criterion.unsubscribe(observer);

        await criterion.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete criterion tests', () => {
    let criterion!: Criterion;

    beforeEach(async () => {
        criterion = await Criterion.create(project.pk, {});
    });

    test('Get criterion', async () => {
        let loaded = await Criterion.get_by_pk(criterion.pk);
        expect(loaded).toEqual(criterion);
    });

    test('Update criterion', async () => {
        let old_timestamp = criterion.last_modified;
        criterion.points = 12;
        criterion.short_description = "shh";
        criterion.long_description = "longer";

        await criterion.save();

        let loaded = await Criterion.get_by_pk(criterion.pk);
        expect(loaded.points).toEqual(12);
        expect(loaded.short_description).toEqual("shh");
        expect(loaded.long_description).toEqual("longer");
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(criterion).toEqual(loaded);

        expect(observer.criterion).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(Criterion, 'Criterion', 'autograder.handgrading.models');
    });

    test('Refresh criterion', async () => {
        let old_timestamp = criterion.last_modified;

        await criterion.refresh();
        expect_dates_equal(criterion.last_modified, old_timestamp);
        expect(observer.criterion).toEqual(criterion);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        let change_criterion = `
from autograder.handgrading.models import Criterion

criterion = Criterion.objects.get(pk=${criterion.pk})
criterion.validate_and_update(points=123)
        `;
        run_in_django_shell(change_criterion);

        await criterion.refresh();

        expect(criterion.points).toEqual(123);
        expect_dates_not_equal(criterion.last_modified, old_timestamp);

        expect(observer.criterion).toEqual(criterion);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete criterion', async () => {
        await criterion.delete();

        expect(observer.criterion).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        let loaded_list = await Criterion.get_all_from_handgrading_rubric(handgrading_rubric.pk);
        expect(loaded_list.length).toEqual(0);
    });
});

describe('Order criterion list tests', () => {
    let ordered_criterion_list!: number[];

    beforeEach(async () => {
        let criterion1 = await Criterion.create(handgrading_rubric.pk, {});
        let criterion2 = await Criterion.create(handgrading_rubric.pk, {});
        let criterion3 = await Criterion.create(handgrading_rubric.pk, {});

        ordered_criterion_list = [criterion1.pk, criterion2.pk, criterion3.pk].sort();
    });

    test('Get ordered criterion list ctor', async () => {
        let loaded_ordered_list = await Criterion.get_order(handgrading_rubric.pk);
        expect(loaded_ordered_list.length).toBe(3);
        expect(loaded_ordered_list).toEqual(ordered_criterion_list);

        expect(observer.created_count).toEqual(0);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
        expect(observer.order_changed_count).toEqual(0);
    });

    test('Update ordered criterion list ctor', async () => {
        let loaded_ordered_list = await Criterion.get_order(handgrading_rubric.pk);
        expect(loaded_ordered_list.length).toBe(3);
        expect(loaded_ordered_list).toEqual(ordered_criterion_list);

        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
        expect(observer.order_changed_count).toEqual(0);

        let changed_ordered_list = [
            loaded_ordered_list[1], loaded_ordered_list[0], loaded_ordered_list[2]
        ];

        let loaded_changed_list = await Criterion.update_order(
            handgrading_rubric.pk,
            changed_ordered_list.map(String)    // Convert to string array
        );

        expect(loaded_changed_list).not.toEqual(loaded_ordered_list);
        expect(loaded_changed_list).toEqual(changed_ordered_list);

        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
        expect(observer.order_changed_count).toEqual(1);
    });
});
