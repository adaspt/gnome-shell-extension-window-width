# Window Width

GNOME Shell extension with keyboard shortcuts for sizing the focused window and moving focus between windows.

Personal extension, used only by me and not published to extensions.gnome.org. There is no preferences UI; shortcuts are defined in the schema.

## Shortcuts

| Shortcut                        | Action                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `Super`+`=`                     | Widen the window to the next 10% step of the work area                         |
| `Super`+`-`                     | Narrow the window to the previous 10% step of the work area                    |
| `Super`+`F`                     | Fill the whole work area without maximizing the window                         |
| `Super`+`R`                     | Set 75% width and full height at the right edge; press again for the left edge |
| `Super`+`Ctrl`+`Left` / `Right` | Focus the topmost window on the monitor to the left / right                    |
| `Super`+`Ctrl`+`Down` / `Up`    | Focus the next / previous window on the current monitor                        |

A monitor without windows gets the pointer at its center instead, so the next app launched opens there.

## Install

```bash
git clone git@github.com:adaspt/gnome-shell-extension-window-width.git
ln -s "$PWD/gnome-shell-extension-window-width" ~/.local/share/gnome-shell/extensions/window-width@adaspt
```

Log out and back in, then enable it with `gnome-extensions enable window-width@adaspt`.

`schemas/gschemas.compiled` is tracked on purpose so a fresh clone works. After editing the schema XML, run `glib-compile-schemas schemas/`.
