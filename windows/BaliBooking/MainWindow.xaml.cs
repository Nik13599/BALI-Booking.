using System;
using System.Windows;
namespace BaliBooking {
  public partial class MainWindow : Window {
    private const string AppUrl = "https://bali-booking.vercel.app/admin";
    public MainWindow() { InitializeComponent(); Loaded += OnLoaded; }
    private async void OnLoaded(object sender, RoutedEventArgs e) {
      await Web.EnsureCoreWebView2Async();
      Web.CoreWebView2.Settings.IsStatusBarEnabled = false;
      Web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
      Web.NavigationCompleted += (_,__) => Splash.Visibility = Visibility.Collapsed;
      Web.Source = new Uri(AppUrl);
    }
  }
}
