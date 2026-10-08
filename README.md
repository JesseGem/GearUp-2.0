# GearUp 2.0

GearUp 2.0 contains two independent applications: an Expo/React Native frontend and a NestJS monolith backend. They are not managed as a monorepo workspace.

## Project layout

```text
frontend/  React Native / Expo app
backend/   NestJS API and PostgreSQL configuration
```

The previous microservices backend is kept separately and is not part of this project.

## Run the applications

Install and start the backend:

```sh
cd backend
npm install
npm run start:dev
```

The API listens on port `3000`. PostgreSQL and JWT settings belong in `backend/.env`. For a new checkout, copy `backend/.env.example` to `backend/.env` and fill in local values; never commit `.env`.

Install and start the frontend in another terminal:

```sh
cd frontend
npm install
npm start
```

The mobile app connects to the monolith on port `3000`. Configure its host in the app's Dev Settings: use `localhost` for web and the iOS simulator, `10.0.2.2` for the Android emulator, or your computer's LAN IP for a physical device.

## GitHub

Open this folder in VS Code. From this directory, initialize a repository only if one is not already present, then stage and commit the project:

```sh
git init
git add .
git commit -m "Initial GearUp 2.0 project structure"
git branch -M main
git remote add origin <your GitHub repository URL>
git push -u origin main
```

Replace the remote placeholder with the URL of your own GitHub repository. Check `git status` before committing to ensure local environment files and generated output are ignored.
