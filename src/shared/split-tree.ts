import { SplitNode, SplitDirection } from './types'
import { MAX_PANES_PER_PROFILE, ADDRESS_BAR_HEIGHT, TAB_BAR_HEIGHT, PANE_GAP } from './constants'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function countLeaves(node: SplitNode): number {
  if (node.type === 'leaf') return 1
  return countLeaves(node.children[0]) + countLeaves(node.children[1])
}

export function getAllLeafPaneIds(node: SplitNode): string[] {
  if (node.type === 'leaf') return [node.paneId]
  return [...getAllLeafPaneIds(node.children[0]), ...getAllLeafPaneIds(node.children[1])]
}

export function findLeaf(node: SplitNode, paneId: string): SplitNode | null {
  if (node.type === 'leaf') {
    return node.paneId === paneId ? node : null
  }
  return findLeaf(node.children[0], paneId) || findLeaf(node.children[1], paneId)
}

export function splitLeaf(
  node: SplitNode,
  targetPaneId: string,
  newPaneId: string,
  direction: SplitDirection
): SplitNode | null {
  if (countLeaves(node) >= MAX_PANES_PER_PROFILE) return null
  if (!findLeaf(node, targetPaneId)) return null

  return splitLeafInner(node, targetPaneId, newPaneId, direction)
}

function splitLeafInner(
  node: SplitNode,
  targetPaneId: string,
  newPaneId: string,
  direction: SplitDirection
): SplitNode {
  if (node.type === 'leaf') {
    if (node.paneId === targetPaneId) {
      return {
        type: 'branch',
        direction,
        ratio: 0.5,
        children: [
          { type: 'leaf', paneId: targetPaneId },
          { type: 'leaf', paneId: newPaneId },
        ],
      }
    }
    return node
  }
  return {
    type: 'branch',
    direction: node.direction,
    ratio: node.ratio,
    children: [
      splitLeafInner(node.children[0], targetPaneId, newPaneId, direction),
      splitLeafInner(node.children[1], targetPaneId, newPaneId, direction),
    ],
  }
}

export function removeLeaf(node: SplitNode, paneId: string): SplitNode | null {
  if (node.type === 'leaf') {
    return node.paneId === paneId ? null : node
  }

  const left = removeLeaf(node.children[0], paneId)
  const right = removeLeaf(node.children[1], paneId)

  if (left === null) return right
  if (right === null) return left

  return {
    type: 'branch',
    direction: node.direction,
    ratio: node.ratio,
    children: [left, right],
  }
}

export function swapLeaves(node: SplitNode, paneIdA: string, paneIdB: string): SplitNode {
  if (node.type === 'leaf') {
    if (node.paneId === paneIdA) return { type: 'leaf', paneId: paneIdB }
    if (node.paneId === paneIdB) return { type: 'leaf', paneId: paneIdA }
    return node
  }
  return {
    type: 'branch',
    direction: node.direction,
    ratio: node.ratio,
    children: [
      swapLeaves(node.children[0], paneIdA, paneIdB),
      swapLeaves(node.children[1], paneIdA, paneIdB),
    ],
  }
}

export function updateRatioByPath(node: SplitNode, path: number[], ratio: number): SplitNode {
  if (path.length === 0 && node.type === 'branch') {
    return { ...node, ratio }
  }
  if (node.type === 'leaf') return node
  const [next, ...rest] = path
  const children: [SplitNode, SplitNode] = [node.children[0], node.children[1]]
  children[next] = updateRatioByPath(children[next], rest, ratio)
  return { ...node, children }
}

export function calculateBounds(node: SplitNode, rect: Rect): Map<string, Rect> {
  const result = new Map<string, Rect>()
  calculateBoundsInner(node, rect, result)
  return result
}

function calculateBoundsInner(node: SplitNode, rect: Rect, result: Map<string, Rect>): void {
  if (node.type === 'leaf') {
    // Pane container: rounded-lg (8px) with 1px border on all sides + 40px address bar + 32px tab bar inside
    // WebContentsView sits inside with small padding for visual breathing room
    const pad = 4
    const chromeHeight = ADDRESS_BAR_HEIGHT + TAB_BAR_HEIGHT
    result.set(node.paneId, {
      x: rect.x + pad,
      y: rect.y + pad + chromeHeight,
      width: rect.width - pad * 2,
      height: rect.height - pad * 2 - chromeHeight,
    })
    return
  }

  const { direction, ratio, children } = node

  if (direction === 'horizontal') {
    const availableWidth = rect.width - PANE_GAP
    const leftWidth = Math.floor(availableWidth * ratio)
    const rightWidth = availableWidth - leftWidth
    calculateBoundsInner(children[0], { x: rect.x, y: rect.y, width: leftWidth, height: rect.height }, result)
    calculateBoundsInner(children[1], { x: rect.x + leftWidth + PANE_GAP, y: rect.y, width: rightWidth, height: rect.height }, result)
  } else {
    const availableHeight = rect.height - PANE_GAP
    const topHeight = Math.floor(availableHeight * ratio)
    const bottomHeight = availableHeight - topHeight
    calculateBoundsInner(children[0], { x: rect.x, y: rect.y, width: rect.width, height: topHeight }, result)
    calculateBoundsInner(children[1], { x: rect.x, y: rect.y + topHeight + PANE_GAP, width: rect.width, height: bottomHeight }, result)
  }
}
