# Window Width

GNOME Shell extension that resizes the focused window in 10% steps of the work area width: `Super`+`=` to widen, `Super`+`-` to narrow.

Personal extension, used only by me and not published to extensions.gnome.org. There is no preferences UI; shortcuts are defined in the schema.

## Install

```bash
git clone git@github.com:adaspt/gnome-shell-extension-window-width.git
ln -s "$PWD/gnome-shell-extension-window-width" ~/.local/share/gnome-shell/extensions/window-width@adaspt
```

Log out and back in, then enable it with `gnome-extensions enable window-width@adaspt`.

`schemas/gschemas.compiled` is tracked on purpose so a fresh clone works. After editing the schema XML, run `glib-compile-schemas schemas/`.
