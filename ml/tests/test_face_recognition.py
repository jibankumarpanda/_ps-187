import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.face_recognition import FaceRecognizer


GALLERY = Path(__file__).resolve().parents[1] / "data" / "faces"


def test_registered_identity_is_recognized():
	recognizer = FaceRecognizer(gallery_dir=GALLERY, threshold=0.45)
	image = cv2.imread(str(GALLERY / "Alia_Bhatt.jpg"))
	results = recognizer.analyze(image)

	assert results
	assert results[0]["identity"] == "Alia_Bhatt"


def test_face_without_gallery_match_is_unknown():
	recognizer = FaceRecognizer(gallery_dir=GALLERY, threshold=0.45)
	recognizer.gallery = {"Alia_Bhatt": recognizer.gallery["Alia_Bhatt"]}
	image = cv2.imread(str(GALLERY / "Amitabh_Bachchan.jpg"))
	results = recognizer.analyze(image)

	assert results
	assert results[0]["identity"] == "UNKNOWN"