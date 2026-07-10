import { EventEmitter } from "events";

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(20); // Scale as needed
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(event: string, data: any): void {
    console.log(`[EventBus] Publishing event: ${event}`, data);
    this.emitter.emit(event, data);
  }

  public subscribe(event: string, callback: (data: any) => void): void {
    this.emitter.on(event, callback);
  }

  public unsubscribe(event: string, callback: (data: any) => void): void {
    this.emitter.off(event, callback);
  }
}

export const eventBus = EventBus.getInstance();
