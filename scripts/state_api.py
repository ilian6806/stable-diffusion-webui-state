from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse

import gradio as gr
import modules.shared as shared
import modules.script_callbacks as script_callbacks


class StateApi():
    """
    API endpoint for the State extension.
    Provides configuration data to the frontend JavaScript.
    Compatible with both AUTOMATIC1111 and Forge WebUI.
    """

    BASE_PATH = '/state'

    def get_path(self, path):
        return f"{self.BASE_PATH}{path}"

    def add_api_route(self, path: str, endpoint, **kwargs):
        return self.app.add_api_route(self.get_path(path), endpoint, **kwargs)

    def start(self, _: gr.Blocks, app: FastAPI):
        self.app = app
        self.add_api_route('/config.json', self.get_config, methods=['GET'])

    def get_config(self):
        """
        Return the UI settings file containing state configuration.
        Works with both A1111 and Forge which may have different settings locations.
        """
        try:
            # Try standard location first (works for both A1111 and Forge)
            settings_file = getattr(shared.cmd_opts, 'ui_settings_file', None)
            if settings_file:
                return FileResponse(settings_file)

            # Fallback: try to get settings from shared.opts
            config = {
                'state': getattr(shared.opts, 'state', []),
                'state_txt2img': getattr(shared.opts, 'state_txt2img', []),
                'state_img2img': getattr(shared.opts, 'state_img2img', []),
                'state_extensions': getattr(shared.opts, 'state_extensions', []),
                'state_ui': getattr(shared.opts, 'state_ui', []),
            }
            return JSONResponse(content=config)
        except Exception as e:
            print(f"[State] Error loading config: {e}")
            return JSONResponse(content={})


try:
    api = StateApi()
    script_callbacks.on_app_started(api.start)
except Exception as e:
    print(f"[State] Error initializing API: {e}")