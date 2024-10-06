import gradio as gr
import modules.shared as shared
from modules import scripts


def on_ui_settings():

    section = ("state", "State")

    shared.opts.add_option("state", shared.OptionInfo([], "Saved main elements", gr.CheckboxGroup, lambda: {
        "choices": [
            "tabs"
        ]
    }, section=section))

    shared.opts.add_option("state_txt2img", shared.OptionInfo([], "Saved elements from txt2img", gr.CheckboxGroup, lambda: {
        "choices": [
            "prompt",
            "negative_prompt",
            "styles",
            "sampling",
            "scheduler",
            "sampling_steps",
            "width",
            "height",
            "batch_count",
            "batch_size",
            "cfg_scale",
            "seed",
            "hires_fix",
            "hires_upscaler",
            "hires_steps",
            "hires_scale",
            "hires_resize_x",
            "hires_resize_y",
            "hires_denoising_strength",
            "refiner",
            "refiner_checkpoint",
            "refiner_switch",
            "upscaler_scale_by_resize",
            "upscaler_scale_by_max_side_length",
            "upscaler_scale_to_w",
            "upscaler_scale_to_h",
            "upscaler_scale_to_crop",
            "upscaler_1",
            "upscaler_2",
            "upscaler_2_visibility",
            "tiled_diffusion",
            "script"
        ]
    }, section=section))

    shared.opts.add_option("state_img2img", shared.OptionInfo([], "Saved elements from img2img", gr.CheckboxGroup, lambda: {
        "choices": [
            "prompt",
            "negative_prompt",
            "styles",
            "refiner",
            "refiner_checkpoint",
            "refiner_switch",
            "upscaler_scale_by_resize",
            "upscaler_scale_by_max_side_length",
            "upscaler_scale_to_w",
            "upscaler_scale_to_h",
            "upscaler_scale_to_crop",
            "upscaler_1",
            "upscaler_2",
            "upscaler_2_visibility",
            "sampling",
            "scheduler",
            "resize_mode",
            "sampling_steps",
            "width",
            "height",
            "batch_count",
            "batch_size",
            "cfg_scale",
            "denoising_strength",
            "seed",
            "tiled_diffusion",
            "script"
        ]
    }, section=section))

    shared.opts.add_option("state_extensions", shared.OptionInfo([], "Saved elements from extensions", gr.CheckboxGroup, lambda: {
        "choices": [
            "control-net",
            "adetailer",
            "multidiffusion",
            "dynamic prompting"
        ]
    }, section=section))

    shared.opts.add_option("state_ui", shared.OptionInfo([
            "Reset Button",
            "Import Button",
            "Export Button"
    ], "State UI", gr.CheckboxGroup, lambda: {
        "choices": [
            "Reset Button",
            "Import Button",
            "Export Button"
        ],
    }, section=section))

scripts.script_callbacks.on_ui_settings(on_ui_settings)
