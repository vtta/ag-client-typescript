import {
    Course,
    Project,
} from '..';

import {
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

// class TestObserver implements InstructorFileObserver {
//     instructor_file: InstructorFile | null = null;
//
//     content: string = "";
//
//     created_count = 0;
//     renamed_count = 0;
//     content_changed_count = 0;
//     deleted_count = 0;
//
//     update_instructor_file_created(file: InstructorFile) {
//         this.instructor_file = file;
//         this.created_count += 1;
//     }
//
//     update_instructor_file_renamed(file: InstructorFile) {
//         this.instructor_file = file;
//         this.renamed_count += 1;
//     }
//
//     update_instructor_file_content_changed(file: InstructorFile, new_content: string) {
//         this.instructor_file = file;
//         this.content_changed_count += 1;
//         this.content = new_content;
//     }
//
//     update_instructor_file_deleted(file: InstructorFile) {
//         this.instructor_file = null;
//         this.deleted_count += 1;
//     }
// }

let observer!: TestObserver;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create({name: 'Project', course: course.pk});

    observer = new TestObserver();
    InstructorFile.subscribe(observer);
});

afterEach(() => {
    InstructorFile.unsubscribe(observer);
});

describe('List/create expected student file tests', () => {
    test('Expected student file ctor', () => {
        fail();
    });

    test('List expected student files', async () => {
        fail();
    });

    test('Create expected student file', async () => {
        fail();
    });

});

describe('Get/update/delete expected student file tests', () => {
    test('Get expected student file', async () => {
        fail();
    });

    test('Update expected student file', async () => {
        fail();
    });

    test('Refresh expected student file', async () => {
        fail();
    });

    test('Delete expected student file', async () => {
        fail();
    });
});
