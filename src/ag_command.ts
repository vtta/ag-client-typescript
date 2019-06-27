export interface AGCommand {
    name: string;
    cmd: string;
    time_limit: number;
    stack_size_limit: number;
    virtual_memory_limit: number;
    process_spawn_limit: number;
}
