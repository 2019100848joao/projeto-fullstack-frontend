IMAGE ?= clinic-frontend
PORT ?= 8080
NETWORK ?= clinic
API_UPSTREAM ?= http://clinic_api:8000

.PHONY: install run dev build preview test lint check docker-build docker-run

install:
	npm ci

run: dev

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

test:
	npm test

lint:
	npm run lint

check: lint test build

docker-build:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p 127.0.0.1:$(PORT):8080 --network $(NETWORK) \
		-e API_UPSTREAM=$(API_UPSTREAM) $(IMAGE)
