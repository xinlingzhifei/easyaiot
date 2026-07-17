import os


def extract_ultralytics_ddp_script(command_line) -> str | None:
    arguments = [str(argument) for argument in (command_line or ())]
    command_text = ' '.join(arguments)
    if 'torch.distributed.run' not in command_text and 'Ultralytics/DDP' not in command_text:
        return None
    for argument in reversed(arguments):
        normalized = argument.strip()
        if normalized.endswith('.py') and os.path.isfile(normalized):
            return os.path.abspath(normalized)
    return None


def _script_references_model_dir(script_path: str, model_dir: str) -> bool:
    try:
        with open(script_path, 'r', encoding='utf-8') as script_file:
            script_content = script_file.read()
    except (OSError, UnicodeError):
        return False
    normalized_model_dir = os.path.abspath(model_dir)
    return normalized_model_dir in script_content


def _process_error_types(psutil_module):
    errors = []
    for name in ('NoSuchProcess', 'AccessDenied', 'ZombieProcess'):
        error_type = getattr(psutil_module, name, None)
        if isinstance(error_type, type) and issubclass(error_type, BaseException):
            errors.append(error_type)
    return tuple(errors) or (OSError,)


def discover_task_ddp_processes(
    model_dir: str,
    root_pid: int | None = None,
    psutil_module=None,
):
    if psutil_module is None:
        import psutil as psutil_module

    process_errors = _process_error_types(psutil_module)
    try:
        root_process = psutil_module.Process(root_pid or os.getpid())
        descendants = root_process.children(recursive=True)
    except process_errors:
        return []

    matched_processes = []
    for process in descendants:
        try:
            script_path = extract_ultralytics_ddp_script(process.cmdline())
        except process_errors:
            continue
        if script_path and _script_references_model_dir(script_path, model_dir):
            matched_processes.append(process)
    return sorted(matched_processes, key=lambda process: process.pid)


def terminate_task_ddp_processes(
    model_dir: str,
    root_pid: int | None = None,
    timeout: float = 5,
    psutil_module=None,
) -> list[int]:
    if psutil_module is None:
        import psutil as psutil_module

    process_errors = _process_error_types(psutil_module)
    processes = discover_task_ddp_processes(
        model_dir,
        root_pid=root_pid,
        psutil_module=psutil_module,
    )
    if not processes:
        return []

    terminated_pids = [process.pid for process in processes]
    for process in reversed(processes):
        try:
            process.terminate()
        except process_errors:
            pass

    _, alive_processes = psutil_module.wait_procs(processes, timeout=timeout)
    for process in alive_processes:
        try:
            process.kill()
        except process_errors:
            pass
    if alive_processes:
        psutil_module.wait_procs(alive_processes, timeout=timeout)
    return terminated_pids
