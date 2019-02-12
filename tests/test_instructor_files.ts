import { Course, CourseObserver, InstructorFile, Project, Semester } from '..';

import {
    do_editable_fields_test,
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    sleep
} from './utils';

beforeAll(() => {
    global_setup();
});

let course!: Course;
let project!: Project;

beforeEach(async () => {
    reset_db();
    make_superuser();
    course = await Course.create({name: 'Course'});
    project = await Project.create({name: 'Project', course: course.pk});
});

describe('List/create instructor file tests', () => {
    test('Instructor file ctor', () => {
        let now = new Date().toISOString();
        let file = new InstructorFile({
            pk: 42,
            project: project.pk,
            name: 'filey',
            size: 1000,
            last_modified: now,
        });

        expect(file.pk).toEqual(42);
        expect(file.project).toEqual(project.pk);
        expect(file.name).toEqual('filey');
        expect(file.size).toEqual(1000);
        expect(file.last_modified).toEqual(now);
    });

    test('List instructor files', async () => {
        let create_files = `
from autograder.core.models import InstructorFile, Project
from django.core.files.uploadedfile import SimpleUploadedFile

project = Project.objects.get(pk=${project.pk})

for i in range(2):
    InstructorFile.objects.validate_and_create(
        project=project,
        file_obj=SimpleUploadedFile(f'file{i}', b'spam')
    )
        `;

        run_in_django_shell(create_files);

        let files = await InstructorFile.get_all_from_project(project.pk);
        expect(files[0].name).toEqual('file0');
        expect(files[0].size).toEqual(4);
        expect(files[0].project).toEqual(project.pk);
        expect(files[1].name).toEqual('file1');
        expect(files[1].size).toEqual(4);
        expect(files[1].project).toEqual(project.pk);
    });

    test('Create instructor file', async () => {
        let content = 'spameggsausagespam';
        let new_file = await InstructorFile.create(
            project.pk, 'fileo', new Blob([content])
        );

        expect(new_file.name).toEqual('fileo');
        expect(new_file.project).toEqual(project.pk);
        expect(new_file.size).toEqual(content.length);

        let get_content = `
from autograder.core.models import InstructorFile
file_ = InstructorFile.objects.get(pk=${new_file.pk})
with file_.open() as f:
    print(f.read(), end='')
        `;

        let {stdout} = run_in_django_shell(get_content);
        expect(stdout).toEqual(content);
    });
});

describe('Get/update/delete instructor file tests', () => {
    let instructor_file!: InstructorFile;
    let file_content = 'somefilecontentstheyaresupergreat!';
    let file_name = 'superfile';

    beforeEach(async () => {
        instructor_file = await InstructorFile.create(
            project.pk, file_name, new Blob([file_content]));
    });

    test('Get instructor file', async () => {
        let loaded = await InstructorFile.get_by_pk(instructor_file.pk);
        expect(loaded).toEqual(instructor_file);
    });

    test('Get instructor file content', async () => {
        let loaded_content = await instructor_file.get_content();
        expect(loaded_content).toEqual(file_content);
    });

    test('Update instructor file content and refresh', async () => {
        let new_content = 'thisissomenewcontentweeeeeee';
        // Load another copy of the instructor file that we can refresh.
        let refresh_me = await InstructorFile.get_by_pk(instructor_file.pk);

        let original_timestamp = instructor_file.last_modified;

        await instructor_file.set_content(new Blob([new_content]));
        expect(instructor_file.last_modified).not.toEqual(original_timestamp);

        expect(refresh_me.last_modified).toEqual(original_timestamp);
        await refresh_me.refresh();
        expect(refresh_me.last_modified).toEqual(instructor_file.last_modified);

        let get_content = `
from autograder.core.models import InstructorFile
file_ = InstructorFile.objects.get(pk=${instructor_file.pk})
with file_.open() as f:
    print(f.read(), end='')
        `;

        let {stdout} = run_in_django_shell(get_content);
        expect(stdout).toEqual(new_content);
    });

    test('Rename and refresh instructor file', async () => {
        let new_name = 'thisisanewfilename';
        // Load another copy of the instructor file that we can refresh.
        let refresh_me = await InstructorFile.get_by_pk(instructor_file.pk);

        let original_timestamp = instructor_file.last_modified;

        await instructor_file.rename(new_name);
        expect(instructor_file.name).toEqual(new_name);
        expect(instructor_file.last_modified).not.toEqual(original_timestamp);

        expect(refresh_me.name).not.toEqual(new_name);
        expect(refresh_me.last_modified).toEqual(original_timestamp);
        await refresh_me.refresh();
        expect(refresh_me.name).toEqual(new_name);
        expect(refresh_me.last_modified).toEqual(instructor_file.last_modified);
    });

    test('Delete instructor file', async () => {
        await instructor_file.delete();

        let get_num_instructor_files = `
from autograder.core.models import InstructorFile
print(InstructorFile.objects.count(), end='')
        `;

        let {stdout} = run_in_django_shell(get_num_instructor_files)
        expect(parseInt(stdout, 10)).toEqual(0);
    });
});

// -------------------------------------------------------------------

// describe('Course observer tests', () => {
//     class TestObserver implements CourseObserver {
//         created_count = 0;
//         changed_count = 0;
//         course: Course | null = null;
//
//         update_course_changed(course: Course) {
//             this.course = course;
//             this.changed_count += 1;
//         }
//
//         update_course_created(course: Course) {
//             this.course = course;
//             this.created_count += 1;
//         }
//     }
//
//     let observer!: TestObserver;
//
//     beforeEach(() => {
//         reset_db();
//         make_superuser();
//         observer = new TestObserver();
//         console.log(observer);
//         Course.subscribe(observer);
//     });
//
//     test('Course.create update_course_created', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         expect(observer.course).toEqual(course);
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(0);
//     });
//
//     test('Course.save update_course_changed', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         let old_timestamp = course.last_modified;
//         await course.save();
//
//         expect(observer.course).toEqual(course);
//         expect(observer.course!.last_modified).not.toEqual(old_timestamp);
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(1);
//     });
//
//     test('Course.copy update_course_created', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         let clone = await course.copy('New Coursey', Semester.fall, 2019);
//
//         expect(observer.course).toEqual(clone);
//         expect(observer.created_count).toEqual(2);
//         expect(observer.changed_count).toEqual(0);
//     });
//
//     test('Course.refresh last_modified different update_course_changed', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         let old_timestamp = course.last_modified;
//
//         let rename = `
// from autograder.core.models import Course
// c = Course.objects.get(pk=${course.pk})
// c.validate_and_update(name='Renamed')
//         `;
//
//         run_in_django_shell(rename);
//
//         await course.refresh();
//         expect(observer.course).toEqual(course);
//         expect(observer.course!.last_modified).not.toEqual(old_timestamp);
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(1);
//     });
//
//     test('Course.refresh last_modified unchanged', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         let old_timestamp = course.last_modified;
//         await course.refresh();
//
//         expect(observer.course).toEqual(course);
//         expect(observer.course!.last_modified).toEqual(old_timestamp);
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(0);
//     });
//
//     test('Unsubscribe', async () => {
//         let course = await Course.create({
//             name: 'Coursey'
//         });
//
//         expect(observer.course).toEqual(course);
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(0);
//
//         Course.unsubscribe(observer);
//
//         await course.save();
//         expect(observer.created_count).toEqual(1);
//         expect(observer.changed_count).toEqual(0);
//     });
// });
