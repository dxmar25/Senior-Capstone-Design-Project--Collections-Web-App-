# Collections

<b>Disclaimer:</b> This tutorial is made for a linux environment. If you're using mac you'll need to replace with apt commands with their brew equivalent.

## How to run frontend (React)

### 1. Install all Dependencies
Start a local instance of the website by running the following commands:

```bash
sudo apt update
sudo apt upgrade
sudo apt install nodejs
sudo apt install npm
npm install framer-motion
npm install react-router-dom
npm install recharts
npm install
```

### 2. Configure Environment Variables

Create another `.env` file in the Collections root directory:
```
touch .env
```
With the following variables:
```
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_API_DOMAIN= # Add info here
REACT_APP_S3_DOMAIN= # Add info here
REACT_APP_WEBSOCKET_URL= # Add info here

REACT_APP_GOOGLE_CLIENT_ID= # Add info here
REACT_APP_GOOGLE_CLIENT_SECRET= # Add info here
```

### 3. Run the Frontend
Create a new terminal in the root directroy, run the following:
```bash
npm start
```

### 4. If recompiling, run the following kill comands
```bash
npx kill-port 3000
```
```bash
npx kill-port 8000
```

## How to run backend (Django + Channels with Daphne)

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:
```bash
touch backend/.env
```

With the following variables:
```bash
DB_NAME=collections_db
DB_USER=admin
DB_PASSWORD=your_password
DB_HOST=your_host
DB_PORT=3306
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=your_region

GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```
These are placeholders, get the copy for it in discord files channel.

### 3. Create a virtual environment
```bash
sudo apt-get install python3-venv
python3 -m venv venv  # Install the 'venv' module first if it's not already available
source venv/bin/activate
```

### 4. Install all python dependencies
```bash
pip install -r requirements.txt
```

### 5. Run the Backend with Daphne
```bash
# From the backend directory
cd backend
daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```