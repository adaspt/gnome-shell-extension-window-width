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
const FILL_KEYBINDING = "fill-work-area";
const THREE_QUARTER_KEYBINDING = "three-quarter-width";
const FOCUS_MONITOR_LEFT_KEYBINDING = "focus-monitor-left";
const FOCUS_MONITOR_RIGHT_KEYBINDING = "focus-monitor-right";
const FOCUS_NEXT_WINDOW_KEYBINDING = "focus-next-window";
const FOCUS_PREVIOUS_WINDOW_KEYBINDING = "focus-previous-window";
const WIDTH_STEPS = 10;
const THREE_QUARTER_WIDTH = 0.75;
// Pixels by which a window may miss a step and still count as being on it,
// e.g. when size increments keep it from reaching the exact width.
const SNAP_TOLERANCE = 8;

const ResizeDirection = {
  INCREASE: 1,
  DECREASE: -1,
};

const CycleDirection = {
  NEXT: 1,
  PREVIOUS: -1,
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

// Right edge first; a window already sitting there goes to the left edge.
function getThreeQuarterX(frame, workArea, targetWidth) {
  const workAreaRight = workArea.x + workArea.width;
  const isAtRight =
    Math.abs(frame.width - targetWidth) <= SNAP_TOLERANCE &&
    Math.abs(frame.x + frame.width - workAreaRight) <= SNAP_TOLERANCE;

  return isAtRight ? workArea.x : workAreaRight - targetWidth;
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
    this._addKeybinding(FILL_KEYBINDING, () => this._fillWorkArea());
    this._addKeybinding(THREE_QUARTER_KEYBINDING, () =>
      this._placeThreeQuarterWidth(),
    );
    this._addKeybinding(FOCUS_MONITOR_LEFT_KEYBINDING, () =>
      this._focusNeighborMonitor(Meta.DisplayDirection.LEFT),
    );
    this._addKeybinding(FOCUS_MONITOR_RIGHT_KEYBINDING, () =>
      this._focusNeighborMonitor(Meta.DisplayDirection.RIGHT),
    );
    this._addKeybinding(FOCUS_NEXT_WINDOW_KEYBINDING, () =>
      this._cycleMonitorWindows(CycleDirection.NEXT),
    );
    this._addKeybinding(FOCUS_PREVIOUS_WINDOW_KEYBINDING, () =>
      this._cycleMonitorWindows(CycleDirection.PREVIOUS),
    );
  }

  disable() {
    Main.wm.removeKeybinding(INCREASE_KEYBINDING);
    Main.wm.removeKeybinding(DECREASE_KEYBINDING);
    Main.wm.removeKeybinding(FILL_KEYBINDING);
    Main.wm.removeKeybinding(THREE_QUARTER_KEYBINDING);
    Main.wm.removeKeybinding(FOCUS_MONITOR_LEFT_KEYBINDING);
    Main.wm.removeKeybinding(FOCUS_MONITOR_RIGHT_KEYBINDING);
    Main.wm.removeKeybinding(FOCUS_NEXT_WINDOW_KEYBINDING);
    Main.wm.removeKeybinding(FOCUS_PREVIOUS_WINDOW_KEYBINDING);

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
    const window = this._getResizableFocusedWindow();
    if (!window) return;

    const frame = window.get_frame_rect();
    const workArea = window.get_work_area_current_monitor();

    const targetWidth = getTargetWidth(frame.width, workArea.width, direction);
    if (targetWidth === frame.width) return;

    const targetX = getTargetX(frame, workArea, targetWidth);

    this._moveResizeWindow(window, targetX, frame.y, targetWidth, frame.height);
  }

  _fillWorkArea() {
    const window = this._getResizableFocusedWindow();
    if (!window) return;

    const { x, y, width, height } = window.get_work_area_current_monitor();

    this._moveResizeWindow(window, x, y, width, height);
  }

  _placeThreeQuarterWidth() {
    const window = this._getResizableFocusedWindow();
    if (!window) return;

    const frame = window.get_frame_rect();
    const workArea = window.get_work_area_current_monitor();

    const targetWidth = Math.round(workArea.width * THREE_QUARTER_WIDTH);
    const targetX = getThreeQuarterX(frame, workArea, targetWidth);

    this._moveResizeWindow(
      window,
      targetX,
      workArea.y,
      targetWidth,
      workArea.height,
    );
  }

  _focusNeighborMonitor(direction) {
    const monitor = global.display.get_monitor_neighbor_index(
      this._getCurrentMonitor(),
      direction,
    );
    if (monitor < 0) return;

    const windows = this._getMonitorWindows(monitor);
    if (windows.length === 0) {
      this._focusEmptyMonitor(monitor);
      return;
    }

    // Sorted from the lowest to the topmost.
    const topmost = global.display.sort_windows_by_stacking(windows).at(-1);

    topmost.activate(global.get_current_time());
  }

  // New windows open on the pointer's monitor, so the pointer moves there.
  // Focus is dropped to make that monitor the current one for the shortcuts.
  _focusEmptyMonitor(monitor) {
    const geometry = global.display.get_monitor_geometry(monitor);
    const seat = global.stage.context.get_backend().get_default_seat();

    seat.warp_pointer(
      Math.round(geometry.x + geometry.width / 2),
      Math.round(geometry.y + geometry.height / 2),
    );
    global.display.unset_input_focus(global.get_current_time());
  }

  _cycleMonitorWindows(direction) {
    // Activating a window changes both stacking and MRU order, so the cycle
    // follows the order in which the windows were created instead.
    const windows = this._getMonitorWindows(this._getCurrentMonitor()).sort(
      (a, b) => a.get_stable_sequence() - b.get_stable_sequence(),
    );
    if (windows.length === 0) return;

    const index = windows.indexOf(global.display.focus_window);
    // Nothing in the cycle is focused: start from its first or last window.
    const targetIndex =
      index < 0 && direction === CycleDirection.PREVIOUS
        ? windows.length - 1
        : (index + direction + windows.length) % windows.length;
    if (targetIndex === index) return;

    windows[targetIndex].activate(global.get_current_time());
  }

  // The focused window's monitor, or the pointer's one if nothing is focused.
  _getCurrentMonitor() {
    return (
      global.display.focus_window?.get_monitor() ??
      global.display.get_current_monitor()
    );
  }

  // Switchable windows visible on the monitor in the active workspace.
  _getMonitorWindows(monitor) {
    const workspace = global.workspace_manager.get_active_workspace();

    return global.display
      .get_tab_list(Meta.TabList.NORMAL, workspace)
      .filter(
        (window) =>
          window.get_monitor() === monitor && window.showing_on_its_workspace(),
      );
  }

  _getResizableFocusedWindow() {
    const window = global.display.focus_window;
    if (window?.get_window_type() !== Meta.WindowType.NORMAL) return null;
    // Unlike allows_resize(), resizeable stays true while maximized.
    if (!window.resizeable || !window.allows_move()) return null;

    return window;
  }

  _moveResizeWindow(window, x, y, width, height) {
    // Tiled windows are vertically maximized, so this untiles them too.
    if (window.get_maximize_flags() !== 0) window.unmaximize();

    window.move_resize_frame(true, x, y, width, height);
  }
}
