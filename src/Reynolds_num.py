from Fields import *

def calc_reynolds():
    re = (u_max[0] * ny) / nu
    re = round(re, 2)
    return re