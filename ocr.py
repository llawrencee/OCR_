#!/usr/bin/env python3

# IMPORT LIBRARIES
import sys
from PIL import Image
from pytesseract import pytesseract

path_to_tesseract = "C:/Users/Lawrence/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"
image_path = sys.argv[1]

image = Image.open(image_path)

pytesseract.tesseract_cmd = path_to_tesseract

text = pytesseract.image_to_string(image, lang="eng")

print(text[:-1])
sys.stdout.flush()