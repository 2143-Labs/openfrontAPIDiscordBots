{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = (import nixpkgs { inherit system; });
        nodejs = pkgs.nodejs_24;
      in rec {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.nodePackages.typescript-language-server
            #pkgs.nodePackages.eslint
            #pkgs.nodePackages.typescript
          ];

          shellHook = ''
          '';
        };

        packages.default = packages.discordbot;
        packages.discordbot = pkgs.buildNpmPackage {
          pname = "openfront-api-discordbot";
          version = "0.1.0";
          buildInputs = [
            nodejs
          ];

          # We also need to include submodules here:
          src = ./.;
          npmDeps = pkgs.importNpmLock {
            npmRoot = ./.;
          };
          npmConfigHook = pkgs.importNpmLock.npmConfigHook;
          dontNpmPrune = true;
          dontNpmBuild = true;
          nodejs = pkgs.nodejs_24;
          installPhase = ''
            runHook preInstall

            mkdir -p $out/bin/
            mkdir -p $out/
            cp -r **/*.js $out/
            cp ./package.json $out/
            cp -r ./node_modules/ $out/node_modules/

            cat > $out/bin/openfront-api-discordbot <<EOF
            #!/bin/sh
            ${nodejs}/bin/npm start
            EOF
            chmod +x $out/bin/openfront-api-discordbot

            runHook postInstall
          '';
        };

        packages.container = pkgs.dockerTools.buildLayeredImage {
          name = "openfront-api-discordbot";
          contents = [
            packages.discordbot
            nodejs
          ];

          config = {
            ExposedPorts = { "3000/tcp" = { }; };
            EntryPoint = [ "${packages.discordbot}/bin/openfront-api-discordbot" ];
            Env = [ ];
          };
        };

      }
    );
}
