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
const WIDTH_INCREMENT = 0.1;
const EDGE_TOLERANCE = 1;

const ResizeDirection = {
  INCREASE: 1,
  DECREASE: -1,
};

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
    if (!this._isNormalWindow(window)) return;

    const frame = window.get_frame_rect();
    const workArea = window.get_work_area_current_monitor();
    const tileSide = this._getTileSide(frame, workArea);
    const isMaximized = window.is_maximized();
    if (!this._canResizeWindow(window, tileSide, isMaximized, direction)) return;

    const step = Math.round(workArea.width * WIDTH_INCREMENT);
    if (step <= 0) return;

    const targetWidth = this._getTargetWidth(frame.width, workArea.width, step, direction);
    if (targetWidth === frame.width) return;

    const anchor = this._getAnchor(frame, workArea, tileSide);
    const targetX = this._getTargetX(frame, workArea, targetWidth, anchor);

    if (tileSide || isMaximized) {
      window.unmaximize();
    }

    window.move_resize_frame(true, targetX, frame.y, targetWidth, frame.height);
  }

  _isNormalWindow(window) {
    if (!window) return false;
    if (window.get_window_type() !== Meta.WindowType.NORMAL) return false;

    return true;
  }

  _canResizeWindow(window, tileSide, isMaximized, direction) {
    if (window.is_fullscreen()) return false;
    if (isMaximized && !tileSide && direction !== ResizeDirection.DECREASE)
      return false;
    if (isMaximized || tileSide) return true;
    if (!window.allows_resize() || !window.allows_move()) return false;

    return true;
  }

  _getTargetWidth(currentWidth, workAreaWidth, step, direction) {
    const minWidth = step;
    const maxWidth = workAreaWidth;
    const currentSteps = currentWidth / step;
    const targetSteps =
      direction === ResizeDirection.INCREASE
        ? Math.floor(currentSteps) + 1
        : Math.ceil(currentSteps) - 1;

    return this._clamp(targetSteps * step, minWidth, maxWidth);
  }

  _getAnchor(frame, workArea, tileSide) {
    if (tileSide) return tileSide;

    const leftDistance = frame.x - workArea.x;
    const rightDistance = workArea.x + workArea.width - (frame.x + frame.width);

    return rightDistance < leftDistance ? "right" : "left";
  }

  _getTileSide(frame, workArea) {
    const fillsHeight =
      Math.abs(frame.y - workArea.y) <= EDGE_TOLERANCE &&
      Math.abs(frame.height - workArea.height) <= EDGE_TOLERANCE;
    const isNarrowerThanWorkArea = frame.width < workArea.width - EDGE_TOLERANCE;

    if (!fillsHeight || !isNarrowerThanWorkArea) return null;

    if (Math.abs(frame.x - workArea.x) <= EDGE_TOLERANCE) return "left";

    const frameRight = frame.x + frame.width;
    const workAreaRight = workArea.x + workArea.width;
    if (Math.abs(frameRight - workAreaRight) <= EDGE_TOLERANCE) return "right";

    return null;
  }

  _getTargetX(frame, workArea, targetWidth, anchor) {
    const workAreaRight = workArea.x + workArea.width;
    let targetX = anchor === "right" ? frame.x + frame.width - targetWidth : frame.x;

    if (targetX < workArea.x) targetX = workArea.x;
    if (targetX + targetWidth > workAreaRight) targetX = workAreaRight - targetWidth;

    return targetX;
  }

  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}
