/// <reference types="vite/client" />
interface Window {
  __lohan?: Record<string, unknown>;
}
declare module "hanzi-writer" {
  const HanziWriter: {
    create: (el: HTMLElement | string, character: string, opts?: Record<string, unknown>) => {
      quiz: (opts?: Record<string, unknown>) => void;
      animateCharacter: (opts?: Record<string, unknown>) => void;
      cancelQuiz: () => void;
      hideCharacter: () => void;
      showCharacter: () => void;
      showOutline: () => void;
      hideOutline: () => void;
      setCharacter: (c: string) => void;
      destroy: () => void;
    };
    loadCharacterData?: (c: string) => Promise<unknown>;
  };
  export default HanziWriter;
}
