import type { IconPackModule } from "../core/types";

declare module "@dev-ui/icons-packs/*" {
  const pack: IconPackModule;
  export default pack;
}
