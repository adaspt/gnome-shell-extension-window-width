/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import Meta from "gi://Meta";
import Shell from "gi://Shell";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

const INCREASE_KEYBINDING = "increase-window-width";
const DECREASE_KEYBINDING = "decrease-window-width";
const WIDTH_STEPS = 10;
// Pixels by which a window may miss a step and still count as being on it,
// e.g. when size increments keep it from reaching the exact width.
const SNAP_TOLERANCE = 8;

const ResizeDirection = {
  INCREASE: 1,
  DECREASE: -1,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTargetWidth(currentWidth, workAreaWidth, direction) {
  const step = workAreaWidth / WIDTH_STEPS;
  const targetSteps =
    direction === ResizeDirection.INCREASE
      ? Math.floor((currentWidth + SNAP_TOLERANCE) / step) + 1
      : Math.ceil((currentWidth - SNAP_TOLERANCE) / step) - 1;

  return Math.round(clamp(targetSteps, 1, WIDTH_STEPS) * step);
}

// Keeps the edge nearest to the work area border in place.
function getTargetX(frame, workArea, targetWidth) {
  const frameRight = frame.x + frame.width;
  const workAreaRight = workArea.x + workArea.width;
  const anchorRight = workAreaRight - frameRight < frame.x - workArea.x;

  return clamp(
    anchorRight ? frameRight - targetWidth : frame.x,
    workArea.x,
    workAreaRight - targetWidth,
  );
}

export default class WindowWidthExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    this._addKeybinding(INCREASE_KEYBINDING, () =>
      this._resizeFocusedWindow(ResizeDirection.INCREASE),
    );
    this._addKeybinding(DECREASE_KEYBINDING, () =>
      this._resizeFocusedWindow(ResizeDirection.DECREASE),
    );
  }

  disable() {
    Main.wm.removeKeybinding(INCREASE_KEYBINDING);
    Main.wm.removeKeybinding(DECREASE_KEYBINDING);

    this._settings = null;
  }

  _addKeybinding(name, handler) {
    Main.wm.addKeybinding(
      name,
      this._settings,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL,
      handler,
    );
  }

  _resizeFocusedWindow(direction) {
    const window = global.display.focus_window;
    if (window?.get_window_type() !== Meta.WindowType.NORMAL) return;
    // Unlike allows_resize(), resizeable stays true while maximized.
    if (!window.resizeable || !window.allows_move()) return;

    const frame = window.get_frame_rect();
    const workArea = window.get_work_area_current_monitor();

    const targetWidth = getTargetWidth(frame.width, workArea.width, direction);
    if (targetWidth === frame.width) return;

    const targetX = getTargetX(frame, workArea, targetWidth);

    // Tiled windows are vertically maximized, so this untiles them too.
    if (window.get_maximize_flags() !== 0) window.unmaximize();

    window.move_resize_frame(true, targetX, frame.y, targetWidth, frame.height);
  }
}
