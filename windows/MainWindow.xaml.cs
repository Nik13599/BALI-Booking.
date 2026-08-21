using System; using System.IO; using System.Windows;
namespace BaliBooking;
public partial class MainWindow: Window {
 const string BaseUrl="https://mvnxfouyoynqyjdpcblh.supabase.co/functions/v1/bali-booking-app?mode=admin";
 readonly string TokenFile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"BALI","Booking","admin.token");
 public MainWindow() { InitializeComponent(); Loaded += async (_,__) => { Directory.CreateDirectory(Path.GetDirectoryName(TokenFile)!); var args=Environment.GetCommandLineArgs(); foreach(var a in args) if(a.StartsWith("--setup=")) File.WriteAllText(TokenFile,a.Substring(8)); var token=File.Exists(TokenFile)?File.ReadAllText(TokenFile).Trim():""; await Web.EnsureCoreWebView2Async(); Web.DefaultBackgroundColor=System.Drawing.Color.Black; Web.Source=new Uri(string.IsNullOrEmpty(token)?BaseUrl:BaseUrl+"&setup="+Uri.EscapeDataString(token)); }; }
}
