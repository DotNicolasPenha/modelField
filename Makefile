.PHONY: build build-linux build-windows docker clean release

VERSION ?= $(shell git describe --tags --always 2>/dev/null || echo "dev")

build:
	./build.sh

build-linux:
	./build.sh

build-windows:
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc \
		wails build -o build/bin/ModelField-windows-amd64.exe

docker:
	docker build -t modelfield-build .
	docker run --rm -v $(CURDIR)/build:/app/build modelfield-build

clean:
	rm -rf build/bin/*

release:
	./build.sh
	git tag -a v$(VERSION) -m "Release v$(VERSION)" 2>/dev/null || true
	git push origin v$(VERSION) 2>/dev/null || true

deps-sudo:
	@echo "Creating webkit2gtk-4.0 compatibility symlink..."
	sudo ln -sf /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.1.pc \
		/usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.0.pc
	@echo "Done."

help:
	@echo "ModelField Build Commands"
	@echo ""
	@echo "  make              Build for Linux (auto-detect)"
	@echo "  make build-linux  Same as above"
	@echo "  make build-windows Cross-compile for Windows"
	@echo "  make docker       Build inside Docker container"
	@echo "  make clean        Remove build/bin/"
	@echo "  make release      Build + tag + push"
	@echo "  make deps-sudo    Create webkit symlink (one-time)"
	@echo "  make help         Show this"
