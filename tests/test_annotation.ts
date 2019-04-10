import {
    Annotation, AnnotationObserver,
    Course,
    HandgradingRubric, NewAnnotationData,
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

class TestObserver implements AnnotationObserver {
    annotation: Annotation | null = null;
    annotation_list: number[] | null = null;

    created_count = 0;
    changed_count = 0;
    deleted_count = 0;
    order_changed_count = 0;

    update_annotation_changed(annotation: Annotation): void {
        this.changed_count += 1;
        this.annotation = annotation;
    }

    update_annotation_created(annotation: Annotation): void {
        this.created_count += 1;
        this.annotation = annotation;
    }

    update_annotation_deleted(annotation: Annotation): void {
        this.deleted_count += 1;
        this.annotation = null;
    }

    update_annotations_order_changed(annotation_list: number[]): void {
        this.order_changed_count += 1;
        this.annotation_list = annotation_list;
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
    Annotation.subscribe(observer);
});

afterEach(() => {
    Annotation.unsubscribe(observer);
});

describe('List/create annotation tests', () => {
    test('Annotation ctor', () => {
        let now = (new Date()).toISOString();
        let annotation = new Annotation({
            pk: 7,
            handgrading_rubric: handgrading_rubric.pk,
            short_description: "short",
            long_description: "looong",
            deduction: -10,
            max_deduction: -20,
            last_modified: now,
        });

        expect(annotation.pk).toEqual(7);
        expect(annotation.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(annotation.last_modified).toEqual(now);
        expect(annotation.short_description).toEqual("short");
        expect(annotation.long_description).toEqual("looong");
        expect(annotation.deduction).toEqual(-10);
        expect(annotation.max_deduction).toEqual(-20);
    });

    test('List annotations', async () => {
        let create_annotations = `
from autograder.core.models import Project
from autograder.handgrading.models import HandgradingRubric, Annotation
handgrading_rubric = HandgradingRubric.objects.get(pk=${handgrading_rubric.pk})

Annotation.objects.validate_and_create(handgrading_rubric=handgrading_rubric, deduction=-3)
Annotation.objects.validate_and_create(handgrading_rubric=handgrading_rubric, deduction=-2)
Annotation.objects.validate_and_create(handgrading_rubric=handgrading_rubric, deduction=-11)
        `;
        run_in_django_shell(create_annotations);

        let loaded_annotations = await Annotation.get_all_from_handgrading_rubric(
            handgrading_rubric.pk);

        let actual_deductions = loaded_annotations.map(
            (annotation) => annotation.deduction);
        expect(actual_deductions.sort((a, b) => a - b)).toEqual([-11, -3, -2]);
    });

    test('Create annotation only required fields', async () => {
        let created = await Annotation.create(handgrading_rubric.pk, {});

        let loaded = await Annotation.get_all_from_handgrading_rubric(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.deduction).toEqual(0);
        expect(actual.max_deduction).toEqual(null);
        expect(actual.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(actual.short_description).toEqual("");
        expect(actual.long_description).toEqual("");

        expect(observer.annotation).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Create annotation all fields', async () => {
        let created = await Annotation.create(
            handgrading_rubric.pk,
            new NewAnnotationData({
                max_deduction: -21,
                deduction: -2,
                short_description: "shorty",
                long_description: "longy"
            })
        );

        let loaded = await Annotation.get_all_from_handgrading_rubric(project.pk);
        expect(loaded.length).toEqual(1);
        let actual = loaded[0];

        expect(created).toEqual(actual);

        expect(actual.deduction).toEqual(-2);
        expect(actual.max_deduction).toEqual(-21);
        expect(actual.handgrading_rubric).toEqual(handgrading_rubric.pk);
        expect(actual.short_description).toEqual("shorty");
        expect(actual.long_description).toEqual("longy");

        expect(observer.annotation).toEqual(actual);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Unsubscribe', async () => {
        let annotation = await Annotation.create(handgrading_rubric.pk, {});

        expect(observer.annotation).toEqual(annotation);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        Annotation.unsubscribe(observer);

        await annotation.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});

describe('Get/update/delete annotation tests', () => {
    let annotation!: Annotation;

    beforeEach(async () => {
        annotation = await Annotation.create(project.pk, {});
    });

    test('Get annotation', async () => {
        let loaded = await Annotation.get_by_pk(annotation.pk);
        expect(loaded).toEqual(annotation);
    });

    test('Update annotation', async () => {
        let old_timestamp = annotation.last_modified;
        annotation.deduction = -12;
        annotation.max_deduction = -13;
        annotation.short_description = "shh";
        annotation.long_description = "longer";

        await annotation.save();

        let loaded = await Annotation.get_by_pk(annotation.pk);
        expect(loaded.deduction).toEqual(-12);
        expect(loaded.max_deduction).toEqual(-13);
        expect(loaded.short_description).toEqual("shh");
        expect(loaded.long_description).toEqual("longer");
        expect_dates_not_equal(loaded.last_modified, old_timestamp);

        expect(annotation).toEqual(loaded);

        expect(observer.annotation).toEqual(loaded);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Editable fields', () => {
        do_editable_fields_test(Annotation, 'Annotation', 'autograder.handgrading.models');
    });

    test('Refresh annotation', async () => {
        let old_timestamp = annotation.last_modified;

        await annotation.refresh();
        expect_dates_equal(annotation.last_modified, old_timestamp);
        expect(observer.annotation).toEqual(annotation);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);

        let change_annotation = `
from autograder.handgrading.models import Annotation

annotation = Annotation.objects.get(pk=${annotation.pk})
annotation.validate_and_update(deduction=-123)
        `;
        run_in_django_shell(change_annotation);

        await annotation.refresh();

        expect(annotation.deduction).toEqual(-123);
        expect_dates_not_equal(annotation.last_modified, old_timestamp);

        expect(observer.annotation).toEqual(annotation);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(1);
        expect(observer.deleted_count).toEqual(0);
    });

    test('Delete annotation', async () => {
        await annotation.delete();

        expect(observer.annotation).toBeNull();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(1);

        let loaded_list = await Annotation.get_all_from_handgrading_rubric(handgrading_rubric.pk);
        expect(loaded_list.length).toEqual(0);
    });
});

describe('Order annotation list tests', () => {
    let ordered_annotation_list!: number[];

    beforeEach(async () => {
        let annotation1 = await Annotation.create(handgrading_rubric.pk, {});
        let annotation2 = await Annotation.create(handgrading_rubric.pk, {});
        let annotation3 = await Annotation.create(handgrading_rubric.pk, {});

        ordered_annotation_list = [annotation1.pk, annotation2.pk, annotation3.pk].sort();
    });

    test('Get ordered annotation list ctor', async () => {
        let loaded_ordered_list = await Annotation.get_order(handgrading_rubric.pk);
        expect(loaded_ordered_list.length).toBe(3);
        expect(loaded_ordered_list).toEqual(ordered_annotation_list);

        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
        expect(observer.order_changed_count).toEqual(0);
    });

    test('Update ordered annotation list ctor', async () => {
        let loaded_ordered_list = await Annotation.get_order(handgrading_rubric.pk);
        expect(loaded_ordered_list.length).toBe(3);
        expect(loaded_ordered_list).toEqual(ordered_annotation_list);

        expect(observer.created_count).toEqual(3);
        expect(observer.changed_count).toEqual(0);
        expect(observer.deleted_count).toEqual(0);
        expect(observer.order_changed_count).toEqual(0);

        let changed_ordered_list = [
            loaded_ordered_list[1], loaded_ordered_list[0], loaded_ordered_list[2]
        ];

        let loaded_changed_list = await Annotation.update_order(
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
