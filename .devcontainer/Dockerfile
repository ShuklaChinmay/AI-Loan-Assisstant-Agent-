# Python base image
FROM mcr.microsoft.com/vscode/devcontainers/python:3.11

# Install system deps
RUN apt-get update && apt-get install -y build-essential

# Create app dir
WORKDIR /workspace

# Upgrade pip
RUN pip install --upgrade pip
