# Vakkya Widget Customization Options - Complete Reference

## ✅ YES! The widget supports customization

The Vakkya widget provides **5 customization options** via HTML data attributes.

---

## 📋 Complete List of Customization Options

### 1. **data-token** (Required)
- **Description**: Your project authentication token
- **Type**: String
- **Default**: None (required)
- **Example**: `data-token="c1a7e43d21a715b901b6d062e5c2886c580fc5c700b7042bc73f689a4eff7cf3"`

### 2. **data-api-url** (Optional)
- **Description**: Custom API server URL (useful for development/testing)
- **Type**: URL String
- **Default**: `https://api.vakkya.com`
- **Example**: `data-api-url="http://localhost:3001"`

### 3. **data-accent-color** (Optional)
- **Description**: Primary accent color for the widget UI
- **Type**: Any valid CSS color
- **Default**: `#3B82F6` (blue)
- **Supported Formats**:
  - Hex: `#3B82F6`, `#8B5CF6`, `#EC4899`
  - RGB: `rgb(59, 130, 246)`
  - RGBA: `rgba(59, 130, 246, 0.9)`
  - HSL: `hsl(217, 91%, 60%)`
  - HSLA: `hsla(217, 91%, 60%, 0.9)`
  - Named: `blue`, `purple`, `teal`, `pink`, etc.
- **Examples**:
  - `data-accent-color="#8B5CF6"` (purple)
  - `data-accent-color="#EC4899"` (pink)
  - `data-accent-color="#10B981"` (green)
  - `data-accent-color="#F59E0B"` (orange)
  - `data-accent-color="rgba(236, 72, 153, 0.9)"` (pink with transparency)

### 4. **data-theme** (Optional)
- **Description**: Widget theme mode (affects background, text colors, shadows)
- **Type**: Enum
- **Default**: `light`
- **Options**: 
  - `light` - Light theme
  - `dark` - Dark theme
- **Examples**:
  - `data-theme="light"`
  - `data-theme="dark"`

### 5. **data-position** (Optional)
- **Description**: Widget button position on the screen
- **Type**: Enum
- **Default**: `bottom-right`
- **Options**:
  - `bottom-right` - Bottom right corner
  - `bottom-left` - Bottom left corner
- **Examples**:
  - `data-position="bottom-right"`
  - `data-position="bottom-left"`

---

## 🎨 Color Palette Suggestions

Here are some pre-tested color combinations that work well:

### Blue (Default)
```html
data-accent-color="#3B82F6"
```

### Purple
```html
data-accent-color="#8B5CF6"
```

### Pink/Magenta
```html
data-accent-color="#EC4899"
```

### Green
```html
data-accent-color="#10B981"
```

### Orange
```html
data-accent-color="#F59E0B"
```

### Teal
```html
data-accent-color="#14B8A6"
```

### Red
```html
data-accent-color="#EF4444"
```

---

## 🚀 Complete Examples

### Example 1: Default Configuration
```html
<script type="module" src="/src/index.js" 
  data-token="your-token"
  data-api-url="http://localhost:3001"></script>
```

### Example 2: Purple Dark Theme
```html
<script type="module" src="/src/index.js" 
  data-token="your-token"
  data-api-url="http://localhost:3001"
  data-accent-color="#8B5CF6"
  data-theme="dark"
  data-position="bottom-right"></script>
```

### Example 3: Green Light Theme, Left Position
```html
<script type="module" src="/src/index.js" 
  data-token="your-token"
  data-api-url="http://localhost:3001"
  data-accent-color="#10B981"
  data-theme="light"
  data-position="bottom-left"></script>
```

### Example 4: Pink Light Theme
```html
<script type="module" src="/src/index.js" 
  data-token="your-token"
  data-api-url="http://localhost:3001"
  data-accent-color="#EC4899"
  data-theme="light"
  data-position="bottom-right"></script>
```

### Example 5: Orange Dark Theme
```html
<script type="module" src="/src/index.js" 
  data-token="your-token"
  data-api-url="http://localhost:3001"
  data-accent-color="#F59E0B"
  data-theme="dark"
  data-position="bottom-right"></script>
```

---

## 🧪 Testing All Customization Options

I've created **5 demo files** for you to test all the customization options:

1. **demo-index.html** - Index page with links to all demos
2. **demo.html** - Complete documentation with detailed examples
3. **demo-purple-dark.html** - Purple accent + dark theme
4. **demo-pink-light.html** - Pink accent + light theme
5. **demo-green-left.html** - Green accent + left position
6. **demo-orange-dark.html** - Orange accent + dark theme

### How to Test:

1. Start the development server (if not already running):
   ```bash
   pnpm dev
   ```

2. Open your browser and visit:
   - http://localhost:5173/demo-index.html (to see all demos)
   - http://localhost:5173/demo.html (complete documentation)
   - http://localhost:5173/demo-purple-dark.html
   - http://localhost:5173/demo-pink-light.html
   - http://localhost:5173/demo-green-left.html
   - http://localhost:5173/demo-orange-dark.html

3. Click the widget button in each demo to see the different styles in action!

---

## 🔧 How to Customize in Your Own Project

Simply add the data attributes to your script tag:

```html
<script src="https://pub-a237803d9a4049e08f39776dcf74b747.r2.dev/widget.js" 
  data-token="your-project-token"
  data-accent-color="#8B5CF6"
  data-theme="dark"
  data-position="bottom-left"></script>
```

All customization options are **optional** except for `data-token`. If you don't specify an option, the default value will be used.

---

## 📝 Notes

- **Color Validation**: The widget validates all color values. If an invalid color is provided, it will fall back to the default blue (`#3B82F6`)
- **Theme**: The theme affects the overall look including backgrounds, text colors, and shadows
- **Position**: Only bottom corners are supported currently (bottom-right or bottom-left)
- **Live Updates**: To change the widget appearance, modify the data attributes and refresh the page

---

## 🎯 Summary

**Total Customization Options: 5**

1. ✅ `data-token` (Required)
2. ✅ `data-api-url` (Optional)
3. ✅ `data-accent-color` (Optional)
4. ✅ `data-theme` (Optional)
5. ✅ `data-position` (Optional)

All options are fully functional and ready to use in the demo files!
