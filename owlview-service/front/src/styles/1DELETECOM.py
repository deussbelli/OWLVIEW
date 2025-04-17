import re
import os
import tkinter as tk
from tkinter import filedialog

def remove_css_comments(content):
    pattern = re.compile(r"""
        (url\(\s*['"]?.*?['"]?\s*\))  # залишає url(...) як є
        |(/\*[^*]*\*+(?:[^/*][^*]*\*+)*/)  # або знаходить коментар
    """, re.VERBOSE | re.DOTALL)

    def replacer(match):
        if match.group(1):  # це url(...) — залишити
            return match.group(1)
        else:               # це коментар — видалити
            return ''

    return pattern.sub(replacer, content)


def clean_css_files(file_paths):
    for path in file_paths:
        if not path.endswith(".css") or not os.path.isfile(path):
            print(f"Пропущено: {path}")
            continue

        with open(path, "r", encoding="utf-8") as f:
            original = f.read()

        cleaned = remove_css_comments(original)

        with open(path, "w", encoding="utf-8") as f:
            f.write(cleaned)

        print(f"Коментарі видалено з: {path}")


def select_files_and_clean():
    root = tk.Tk()
    root.withdraw()  # не показує основне вікно

    file_paths = filedialog.askopenfilenames(
        title="Виберіть CSS файли для очищення",
        filetypes=[("CSS files", "*.css")],
    )

    if file_paths:
        clean_css_files(file_paths)
    else:
        print("Файли не вибрано.")


if __name__ == "__main__":
    select_files_and_clean()
