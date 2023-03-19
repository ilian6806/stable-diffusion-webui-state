from fastapi import FastAPI, Body, HTTPException, Request, Response
from fastapi.responses import FileResponse

import gradio as gr
import modules.script_callbacks as script_callbacks


class StateApi():

    BASE_PATH = '/state'

    def get_path(self, path):
        return f"{self.BASE_PATH}{path}"

    def add_api_route(self, path: str, endpoint, **kwargs):
        return self.app.add_api_route(self.get_path(path), endpoint, **kwargs)

    def start(self, _: gr.Blocks, app: FastAPI):
        self.app = app
        self.add_api_route('/config.json', self.get_config, methods=['GET'])

    def get_config(self):
        return FileResponse('config.json')


try:
    api = StateApi()
    script_callbacks.on_app_started(api.start)
except:
    pass