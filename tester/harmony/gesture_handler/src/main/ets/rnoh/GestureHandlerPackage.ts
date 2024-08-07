import {RNPackage, TurboModulesFactory} from "@rnoh/react-native-openharmony/ts";
import type {TurboModule, TurboModuleContext} from "@rnoh/react-native-openharmony/ts";
import {RNGestureHandlerModule} from './RNGestureHandlerModule';

class GestureHandlerTurboModulesFactory extends TurboModulesFactory {
  createTurboModule(name: string): TurboModule | null {
    if (name === RNGestureHandlerModule.NAME) {
      return new RNGestureHandlerModule(this.ctx);
    }
    return null;
  }

  hasTurboModule(name: string): boolean {
    return name === RNGestureHandlerModule.NAME;
  }
}

export class GestureHandlerPackage extends RNPackage {
  createTurboModulesFactory(ctx: TurboModuleContext): TurboModulesFactory {
    return new GestureHandlerTurboModulesFactory(ctx);
  }
}
