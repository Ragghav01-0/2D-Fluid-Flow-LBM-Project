import taichi as ti
ti.init(arch=ti.gpu) # Defines whether cpu or gpu is being used

print(f"Current Backend: {ti.lang.impl.current_cfg().arch}")