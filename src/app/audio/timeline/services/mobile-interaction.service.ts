import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MobileInteractionService {

  getMobileButtonTop(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer
    return clipRect.top - buttonLayerRect.top - 38; // 38px above clip
  }

  getMobileDeleteButtonLeft(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer, towards center
    const clipWidth = clipRect.width;
    return clipRect.left - buttonLayerRect.left + (clipWidth * 0.25) - 14; // 25% into clip
  }

  getMobileDuplicateButtonLeft(selectedId: string | null): number | null {
    if (!selectedId) return null;
    
    const clipElement = document.querySelector(`[data-clip-id="${selectedId}"]`) as HTMLElement;
    if (!clipElement) return null;
    
    const buttonLayerEl = document.querySelector('.mobile-button-layer') as HTMLElement;
    if (!buttonLayerEl) return null;
    
    const buttonLayerRect = buttonLayerEl.getBoundingClientRect();
    const clipRect = clipElement.getBoundingClientRect();
    
    // Position relative to mobile button layer, towards center from right
    const clipWidth = clipRect.width;
    return clipRect.right - buttonLayerRect.left - (clipWidth * 0.25) - 14; // 25% from right edge
  }
}