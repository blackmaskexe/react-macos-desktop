"use client";

import type React from "react";

import { useState } from "react";
import { X, Minus, Square } from "lucide-react";
import type { AppWindow } from "../desktop";
import { AppContent } from "./app-content";
import { AppOpeningAnimation } from "./app-opening-animation";
import { IOSSimulatorWindow } from "../ios-simulator";
import { useSimulatorSize } from "../../hooks/use-simulator-size";

interface WindowManagerProps {
  windows: AppWindow[];
  theme?: "light" | "dark";
  onClose: (windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onUpdatePosition: (
    windowId: string,
    position: { x: number; y: number }
  ) => void;
  onUpdateSize: (
    windowId: string,
    size: { width: number; height: number }
  ) => void;
  onBringToFront: (windowId: string) => void;
}

export function WindowManager({
  windows,
  theme = "light",
  onClose,
  onMinimize,
  onUpdatePosition,
  onUpdateSize,
  onBringToFront,
}: WindowManagerProps) {
  const simulatorSize = useSimulatorSize();

  const [dragState, setDragState] = useState<{
    windowId: string | null;
    isDragging: boolean;
    startPos: { x: number; y: number };
    startWindowPos: { x: number; y: number };
  }>({
    windowId: null,
    isDragging: false,
    startPos: { x: 0, y: 0 },
    startWindowPos: { x: 0, y: 0 },
  });

  type OpeningAnimation = {
    appId: string;
    appName: string;
    iconPosition: { x: number; y: number };
    windowPosition: { x: number; y: number };
  };
  const [openingAnimations, setOpeningAnimations] = useState<
    OpeningAnimation[]
  >([]);

  // Resizing state
  const [resizeState, setResizeState] = useState<{
    windowId: string | null;
    isResizing: boolean;
    startPos: { x: number; y: number };
    startWindowSize: { width: number; height: number };
  }>({
    windowId: null,
    isResizing: false,
    startPos: { x: 0, y: 0 },
    startWindowSize: { width: 0, height: 0 },
  });
  // Resize mouse events
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    windowId: string,
    windowSize: { width: number; height: number }
  ) => {
    e.stopPropagation();
    setResizeState({
      windowId,
      isResizing: true,
      startPos: { x: e.clientX, y: e.clientY },
      startWindowSize: windowSize,
    });
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (resizeState.isResizing && resizeState.windowId) {
      const deltaX = e.clientX - resizeState.startPos.x;
      const deltaY = e.clientY - resizeState.startPos.y;
      onUpdateSize(resizeState.windowId, {
        width: Math.max(300, resizeState.startWindowSize.width + deltaX),
        height: Math.max(200, resizeState.startWindowSize.height + deltaY),
      });
    }
    // Also allow window dragging
    handleMouseMove(e);
  };

  const handleResizeMouseUp = () => {
    setResizeState({
      windowId: null,
      isResizing: false,
      startPos: { x: 0, y: 0 },
      startWindowSize: { width: 0, height: 0 },
    });
    handleMouseUp();
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    windowId: string,
    windowPos: { x: number; y: number }
  ) => {
    onBringToFront(windowId);
    setDragState({
      windowId,
      isDragging: true,
      startPos: { x: e.clientX, y: e.clientY },
      startWindowPos: windowPos,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragState.isDragging && dragState.windowId) {
      const deltaX = e.clientX - dragState.startPos.x;
      const deltaY = e.clientY - dragState.startPos.y;

      onUpdatePosition(dragState.windowId, {
        x: dragState.startWindowPos.x + deltaX,
        y: dragState.startWindowPos.y + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setDragState({
      windowId: null,
      isDragging: false,
      startPos: { x: 0, y: 0 },
      startWindowPos: { x: 0, y: 0 },
    });
  };

  const isIOSSimulatorApp = (appId: string) => {
    const result = appId === "gains-chat" || appId === "habitmentor-ai";
    console.log(`isIOSSimulatorApp check: "${appId}" => ${result}`); // Debug log
    return result;
  };

  const isDark = theme === "dark";
  const windowBgClass = isDark ? "bg-gray-800" : "bg-white";
  const titleBarBgClass = isDark
    ? "bg-gray-700 border-gray-600"
    : "bg-gray-100 border-gray-200";
  const titleTextClass = isDark ? "text-gray-200" : "text-gray-700";

  return (
    <div
      className="absolute inset-0 pt-6 pointer-events-auto"
      onMouseMove={handleResizeMouseMove}
      onMouseUp={handleResizeMouseUp}
    >
      {/* Opening Animations */}
      {openingAnimations.map((animation, index) => (
        <AppOpeningAnimation
          key={`${animation.appId}-${index}`}
          appId={animation.appId}
          appName={animation.appName}
          iconPosition={animation.iconPosition}
          windowPosition={animation.windowPosition}
          onComplete={() => {
            setOpeningAnimations((prev) => prev.filter((_, i) => i !== index));
          }}
        />
      ))}
      {windows
        .filter((w) => !w.isMinimized)
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((window) => {
          const isSimulator = isIOSSimulatorApp(window.appId);
          // Only add resize handle for non-simulator windows
          return (
            <div
              key={window.id}
              className={`absolute shadow-2xl overflow-hidden ${
                isSimulator ? "bg-transparent" : `${windowBgClass} rounded-lg`
              }`}
              style={{
                left: window.position.x,
                top: window.position.y,
                width: isSimulator ? simulatorSize.width : window.size.width,
                height: isSimulator ? simulatorSize.height : window.size.height,
                zIndex: window.zIndex,
                userSelect: resizeState.isResizing ? "none" : undefined,
              }}
              onClick={() => onBringToFront(window.id)}
            >
              {isSimulator ? (
                // iOS Simulator Window with title bar above
                <div className="w-full h-full flex flex-col">
                  {/* Simulator Title Bar */}
                  <div
                    className="h-12 bg-gray-700 flex items-center justify-between px-4 text-white text-sm cursor-move select-none rounded-t-lg rounded-b-lg shadow-lg"
                    onMouseDown={(e) =>
                      handleMouseDown(e, window.id, window.position)
                    }
                    style={{ minHeight: "32px", maxHeight: "32px" }} // Force consistent height
                  >
                    <div className="flex items-center space-x-3 flex-shrink-0 w-full justify-between">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose(window.id);
                          }}
                          className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 flex items-center justify-center"
                        >
                          <X className="w-2 h-2 text-red-800 opacity-0 hover:opacity-100" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMinimize(window.id);
                          }}
                          className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 flex items-center justify-center"
                        >
                          <Minus className="w-2 h-2 text-yellow-800 opacity-0 hover:opacity-100" />
                        </button>
                        <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 flex items-center justify-center">
                          <Square className="w-2 h-2 text-green-800 opacity-0 hover:opacity-100" />
                        </button>
                      </div>
                      <span className="font-medium whitespace-nowrap">
                        {window.title}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap text-right block">
                        iOS 18.2
                      </span>
                    </div>
                  </div>

                  {/* Phone Simulator Area (transparent padding maintained) */}
                  <div className="flex-1 relative bg-transparent pt-2">
                    <div
                      style={{
                        width: simulatorSize.phoneWidth,
                        height: simulatorSize.phoneHeight,
                      }}
                    >
                      <IOSSimulatorWindow
                        appId={window.appId}
                        appName={window.title}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Regular macOS Window
                <>
                  {/* Title Bar */}
                  <div
                    className={`h-8 ${titleBarBgClass} border-b flex items-center justify-between px-4 cursor-move select-none window-titlebar`}
                    onMouseDown={(e) =>
                      handleMouseDown(e, window.id, window.position)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose(window.id);
                        }}
                        className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 flex items-center justify-center"
                      >
                        <X className="w-2 h-2 text-red-800 opacity-0 hover:opacity-100" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMinimize(window.id);
                        }}
                        className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 flex items-center justify-center"
                      >
                        <Minus className="w-2 h-2 text-yellow-800 opacity-0 hover:opacity-100" />
                      </button>
                      <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 flex items-center justify-center">
                        <Square className="w-2 h-2 text-green-800 opacity-0 hover:opacity-100" />
                      </button>
                    </div>
                    <div className={`text-sm font-medium ${titleTextClass}`}>
                      {window.title}
                    </div>
                    <div className="w-12" />
                  </div>

                  {/* Window Content */}
                  <div className="flex-1 overflow-hidden">
                    <AppContent appId={window.appId} theme={theme} />
                  </div>
                  {/* Resize Handle */}
                  <div
                    className="absolute bottom-2 right-2 w-5 h-5 bg-gray-700 rounded cursor-nwse-resize flex items-center justify-center z-50"
                    style={{
                      userSelect: "none",
                    }}
                    onMouseDown={(e) =>
                      handleResizeMouseDown(e, window.id, window.size)
                    }
                    title="Resize"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 14L14 2"
                        stroke="#ccc"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 14L14 8"
                        stroke="#ccc"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
