# AutomationX Widgets

This library was generated with [Nx](https://nx.dev).

## Introduction

AutomationX Widgets provides customizable UI components to seamlessly interact with your AutomationX workflows

One of the key features is the `createChat` function, which renders a fully-featured chat-like window.

- If using the UMD build, it is accessible via the `window.widgets` object.
- If using the ES Modules build, it is available as a named export.
  This function requires a webhook URL configuration for your workflow and allows customization through various theme options.

## Usage

### Prerequisites

This library requires the following peer dependencies:

- react (>= 18)
- react-dom (>= 18)

### Using with ES Modules (React)

To use the createChat function with React, follow this example:

```
import { createChat } from '@avalant/automationx-widgets';
import { useEffect } from 'react';

useEffect(() => {
  createChat({ title: 'AutomationX Chat Demo' });
}, []);
```

### Using with UMD Module (HTML)

To use the UMD build directly in an HTML page, include the following script tags:

```
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@avalant/automationx-widgets@latest/index.css" />
<script src="https://cdn.jsdelivr.net/npm/@avalant/automationx-widgets@latest/index.umd.js"></script>

<script>
  widgets.createChat({
    title: 'AutomationX Chat',
    welcomeMessage: 'Hi there 👋',
  });
</script>
```

## Building

Run `nx build widgets` to build the library.
