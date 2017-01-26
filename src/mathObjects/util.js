util = {
  lerp: function(arr, t) {
    return arr[0] + t*(arr[1]-arr[0]);
  },

  inverseLerp: function(arr, x) {
    return (x-arr[0])/(arr[1]-arr[0]);
  }
};
