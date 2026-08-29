import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      // eslint-config-next 16 menaikkan react-hooks ke versi yang menandai
      // pola "fetch-on-mount" (useEffect(() => { void refresh() }, [refresh]))
      // sebagai error — padahal ini pola idiomatik yang sama persis dipakai
      // di seluruh referensi bagdja-website-admin (website-context.tsx,
      // use-auth.ts) dan didokumentasikan resmi React ("Fetching data" di
      // react.dev/learn/synchronizing-with-effects) untuk sinkronisasi ke
      // sumber eksternal (cookie/localStorage/REST API). Turunkan ke warning
      // supaya tidak memblokir build, bukan matikan total.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
