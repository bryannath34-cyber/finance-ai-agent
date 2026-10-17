from typing import Any

class CORSMiddleware:
    def __init__(self, app: Any, allow_origins: Any = None, allow_credentials: bool = False, allow_methods: Any = None, allow_headers: Any = None) -> None: ...
