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
            pkgs.cacert
          ];

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

            # Loop over extra folders/files listed in include-list.txt
            while read item type prefix; do
              # Determine actual source path
              if [ "$prefix" = "noprefix" ]; then
                src="$item"
              else
                src="./$item"
              fi

              if [ "$type" = "folder" ] && [ -d "$src" ]; then
                cp -r "$src" "$out/$item"
              elif [ "$type" = "file" ] && [ -f "$src" ]; then
                cp "$src" "$out/"
              else
                echo "Warning: $item of type $type does not exist, skipping."
              fi
            done < ${./include-list.txt}
            # Existing manual copies
            cp -r ./commands/ $out/commands
            cp -r ./gameIdGetter $out/gameIdGetter
            cp -r ./autoPush $out/autoPush
            cp *.js $out/
            cp ./package.json $out/
            cp -r ./node_modules/ $out/node_modules/
            runHook postInstall
          '';
        };

        packages.container = pkgs.dockerTools.buildLayeredImage {
          name = "openfront-api-discordbot";
          contents = [
            packages.discordbot
            nodejs
            pkgs.bash
            #pkgs.bashInteractive pkgs.busybox
            pkgs.cacert
          ];

          config = {
            ExposedPorts = { "3000/tcp" = { }; };
            Entrypoint = [ "${nodejs}/bin/npm" ];
            Cmd = [ "start" ];
            #Entrypoint = [ "${pkgs.bash}/bin/bash" ];
            Env = [
              "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            ];
          };
        };
      }
    );
}
